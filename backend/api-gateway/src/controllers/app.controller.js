const httpStatus = require('http-status');
const catchAsync = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { appService, mlService } = require('../services');
const { calculateFileHash } = require('../utils/fileHasher');
const fs = require('fs');
const logger = require('../config/logger');

/**
 * Verify an App by Uploading the APK file
 * POST /api/v1/apps/verify-file
 * * Expects 'multipart/form-data' with key 'appFile'
 * * Combines local hash check with ML-powered app-crawler analysis
 */
const verifyAppFile = catchAsync(async (req, res) => {
  // 1. Validation
  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Please upload an APK file to scan.');
  }

  const filePath = req.file.path;
  let mlAnalysis = null;
  let localCheck = null;
  let finalVerdict = 'UNKNOWN';
  let combinedDetails = {};

  try {
    // 2. FAST PRE-CHECK: Compute the Cryptographic Hash (SHA-256)
    // This creates a unique "fingerprint" of the file. Even a 1-byte change
    // (like injecting malware) will completely change this hash.
    const fileHash = await calculateFileHash(filePath);
    logger.info(`APK file hash calculated: ${fileHash}`);

    // 3. LOCAL CHECK: Check against the Official Registry in DB
    const appRecord = await appService.getAppByHash(fileHash);

    if (appRecord) {
      localCheck = {
        found: true,
        status: 'SAFE',
        appDetails: {
          name: appRecord.appName,
          publisher: appRecord.publisher,
          version: appRecord.version,
          lastUpdated: appRecord.updatedAt,
        },
      };
      logger.info(`Local hash match found: ${appRecord.appName}`);
    } else {
      localCheck = {
        found: false,
        status: 'UNKNOWN',
        message: 'Hash not found in local registry',
      };
      logger.warn(`No local hash match for ${fileHash}`);
    }

    // 4. ML ANALYSIS: Call app-crawler for deep analysis
    logger.info('Calling ML app-crawler for deep analysis...');
    
    // Read file buffer for ML service
    const fileBuffer = fs.readFileSync(filePath);
    
    mlAnalysis = await mlService.verifyApp({
      apkFile: {
        buffer: fileBuffer,
        originalname: req.file.originalname,
      },
    });

    // Validate ML response before using
    const isValidResponse = mlService.validateForDbWrite(
      mlAnalysis,
      'appCrawler',
      'verify'
    );

    if (!isValidResponse) {
      logger.error('ML app-crawler returned invalid response, relying on local check only');
      mlAnalysis = {
        status: 'error',
        error: { code: 'INVALID_RESPONSE', message: 'ML service returned invalid data' },
      };
    }

    // 5. COMBINE VERDICTS: Local + ML Analysis
    if (localCheck.found && localCheck.status === 'SAFE') {
      // Local check passed, use it as primary verdict
      if (mlAnalysis.status === 'success' && mlAnalysis.result?.verdict === 'safe') {
        finalVerdict = 'SAFE';
        combinedDetails = {
          ...localCheck.appDetails,
          mlVerdict: 'Confirmed safe by ML analysis',
        };
      } else if (mlAnalysis.status === 'success' && mlAnalysis.result?.verdict !== 'safe') {
        // Conflict: local says safe but ML says suspicious
        finalVerdict = 'WARNING';
        combinedDetails = {
          ...localCheck.appDetails,
          warning: 'ML analysis detected potential issues despite hash match',
          mlDetails: mlAnalysis.result?.details,
        };
        logger.warn(
          `Conflict in verdicts: Local=SAFE, ML=${mlAnalysis.result?.verdict} for ${fileHash}`
        );
      } else {
        // ML analysis failed/unavailable, rely on local
        finalVerdict = 'SAFE';
        combinedDetails = {
          ...localCheck.appDetails,
          note: 'ML analysis unavailable, relying on local hash verification',
        };
      }
    } else {
      // Local check failed, rely on ML analysis
      if (mlAnalysis.status === 'success') {
        finalVerdict = mlAnalysis.result?.verdict === 'safe' ? 'SAFE' : 'SUSPICIOUS';
        combinedDetails = {
          hash: fileHash,
          mlVerdict: mlAnalysis.result?.verdict,
          mlDetails: mlAnalysis.result?.details,
          warning: 'App not in local registry but analyzed by ML',
        };
      } else {
        // Both failed
        finalVerdict = 'UNKNOWN';
        combinedDetails = {
          hash: fileHash,
          warning: 'Unable to verify - not in local registry and ML analysis failed',
        };
      }
    }

    // 6. AUDIT TRAIL: Write to DB with ML verdict
    try {
      await appService.createVerificationAudit({
        fileHash,
        fileName: req.file.originalname,
        localMatch: localCheck.found,
        mlVerdict: mlAnalysis.status === 'success' ? mlAnalysis.result?.verdict : 'error',
        mlDetails: mlAnalysis.result || mlAnalysis.error,
        finalVerdict,
        userId: req.user ? req.user.id : null,
      });
    } catch (auditError) {
      logger.error(`Failed to create audit trail: ${auditError.message}`);
      // Continue even if audit fails
    }

    // 7. Return Combined Verdict
    res.send({
      status: finalVerdict,
      message: getVerdictMessage(finalVerdict),
      details: combinedDetails,
      analysis: {
        localCheck: localCheck.found ? 'MATCHED' : 'NOT_FOUND',
        mlAnalysis: mlAnalysis.status === 'success' ? 'COMPLETED' : 'FAILED',
      },
    });

  } catch (error) {
    logger.error(`Error in app verification: ${error.message}`, { error });
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Error processing APK file');
  } finally {
    // 8. Cleanup: Delete the uploaded file to save server space
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) logger.error('Error deleting temp APK:', err);
      });
    }
  }
});

/**
 * Helper: Get user-friendly verdict message
 */
function getVerdictMessage(verdict) {
  const messages = {
    SAFE: 'This is a verified official application.',
    WARNING: 'Verification completed with warnings. Review details carefully.',
    SUSPICIOUS: 'This application shows suspicious characteristics.',
    UNKNOWN: 'Unable to verify this application. Proceed with extreme caution.',
  };
  return messages[verdict] || 'Verification status unknown.';
}

/**
 * Verify an App by Package Name (e.g., com.bank.mobile)
 * GET /api/v1/apps/verify-package?packageName=com.trustguard.bank
 * * Used by the Browser Extension/Widget to quick-check store links.
 * * Combines local DB check with ML app-crawler analysis
 */
const verifyAppPackage = catchAsync(async (req, res) => {
  const { packageName } = req.query;

  if (!packageName) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Package name is required');
  }

  logger.info(`Verifying package: ${packageName}`);

  // 1. FAST LOCAL CHECK: Query the DB for this package name
  const app = await appService.getAppByPackageName(packageName);

  // 2. ML ANALYSIS: Call app-crawler for package analysis
  logger.info('Calling ML app-crawler for package analysis...');
  
  const mlAnalysis = await mlService.verifyApp({
    packageName,
  });

  // Validate ML response
  const isValidResponse = mlService.validateForDbWrite(
    mlAnalysis,
    'appCrawler',
    'verify'
  );

  if (!isValidResponse) {
    logger.error('ML app-crawler returned invalid response for package check');
  }

  // 3. COMBINE RESULTS
  let finalStatus = 'UNKNOWN';
  let response = {};

  if (app) {
    // Package found in local DB
    if (mlAnalysis.status === 'success' && mlAnalysis.result?.verdict === 'safe') {
      finalStatus = 'OFFICIAL';
      response = {
        status: finalStatus,
        message: 'Verified package found - Confirmed by ML analysis.',
        officialHash: app.fileHash,
        storeUrl: app.storeUrl,
        appDetails: {
          name: app.appName,
          publisher: app.publisher,
        },
        mlVerdict: 'safe',
      };
    } else if (mlAnalysis.status === 'success' && mlAnalysis.result?.verdict !== 'safe') {
      // Conflict
      finalStatus = 'WARNING';
      response = {
        status: finalStatus,
        message: 'Package in registry but ML detected potential issues.',
        officialHash: app.fileHash,
        warning: 'ML analysis suggests caution',
        mlVerdict: mlAnalysis.result?.verdict,
        mlDetails: mlAnalysis.result?.details,
      };
    } else {
      // ML unavailable, rely on local
      finalStatus = 'OFFICIAL';
      response = {
        status: finalStatus,
        message: 'Verified package found.',
        officialHash: app.fileHash,
        storeUrl: app.storeUrl,
        note: 'ML analysis unavailable',
      };
    }
  } else {
    // Package NOT in local DB
    if (mlAnalysis.status === 'success') {
      finalStatus = mlAnalysis.result?.verdict === 'safe' ? 'UNKNOWN_BUT_SAFE' : 'SUSPICIOUS';
      response = {
        status: finalStatus,
        message: mlAnalysis.result?.verdict === 'safe' 
          ? 'Package not in registry but appears safe according to ML analysis.'
          : 'This package is not in our verified registry and ML analysis flagged it.',
        mlVerdict: mlAnalysis.result?.verdict,
        mlDetails: mlAnalysis.result?.details,
        recommendation: 'Proceed with caution and verify through official channels.',
      };
    } else {
      // Both checks failed
      finalStatus = 'UNKNOWN';
      response = {
        status: finalStatus,
        message: 'This package is not in our verified registry. Proceed with caution.',
        note: 'ML analysis unavailable',
      };
    }
  }

  // 4. AUDIT TRAIL
  try {
    await appService.createPackageVerificationAudit({
      packageName,
      localMatch: !!app,
      mlVerdict: mlAnalysis.status === 'success' ? mlAnalysis.result?.verdict : 'error',
      finalStatus,
      userId: req.user ? req.user.id : null,
    });
  } catch (auditError) {
    logger.error(`Failed to create package verification audit: ${auditError.message}`);
  }

  res.send(response);
});

/**
 * Report a Suspicious App
 * POST /api/v1/apps/report
 * * Users can flag a URL or App Name they found on social media.
 */
const reportSuspiciousApp = catchAsync(async (req, res) => {
  const { appName, url, description } = req.body;
  
  const report = await appService.createAppReport({
    appName,
    url,
    description,
    reporterId: req.user ? req.user.id : null // Optional: track who reported it
  });

  res.status(httpStatus.CREATED).send({
    message: 'Report submitted. Our automated crawler will scan this target.',
    reportId: report.id
  });
});

module.exports = {
  verifyAppFile,
  verifyAppPackage,
  reportSuspiciousApp
};