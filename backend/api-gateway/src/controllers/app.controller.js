const httpStatus = require('http-status');
const catchAsync = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { appService } = require('../services');
const { calculateFileHash } = require('../utils/fileHasher');
const fs = require('fs');

/**
 * Verify an App by Uploading the APK file
 * POST /api/v1/apps/verify-file
 * * Expects 'multipart/form-data' with key 'appFile'
 */
const verifyAppFile = catchAsync(async (req, res) => {
  // 1. Validation
  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Please upload an APK file to scan.');
  }

  const filePath = req.file.path;

  try {
    // 2. Compute the Cryptographic Hash (SHA-256)
    // This creates a unique "fingerprint" of the file. Even a 1-byte change
    // (like injecting malware) will completely change this hash.
    const fileHash = await calculateFileHash(filePath);

    // 3. Check against the Official Registry in DB
    const appRecord = await appService.getAppByHash(fileHash);

    // 4. Cleanup: Delete the uploaded file to save server space
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting temp APK:', err);
    });

    // 5. Return Verdict
    if (appRecord) {
      return res.send({
        status: 'SAFE',
        message: 'This is a verified official application.',
        appDetails: {
          name: appRecord.appName,
          publisher: appRecord.publisher,
          version: appRecord.version,
          lastUpdated: appRecord.updatedAt
        }
      });
    } else {
      // If hash not found, it might be a fake/modded version
      return res.send({
        status: 'WARNING',
        message: 'Unknown application. Signature does not match any official bank app.',
        detectedHash: fileHash
      });
    }

  } catch (error) {
    // Ensure file is deleted even if error occurs
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Error processing APK file');
  }
});

/**
 * Verify an App by Package Name (e.g., com.bank.mobile)
 * GET /api/v1/apps/verify-package?packageName=com.trustguard.bank
 * * Used by the Browser Extension/Widget to quick-check store links.
 */
const verifyAppPackage = catchAsync(async (req, res) => {
  const { packageName } = req.query;

  if (!packageName) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Package name is required');
  }

  // Query the DB for this package name
  const app = await appService.getAppByPackageName(packageName);

  if (!app) {
    return res.send({
      status: 'UNKNOWN',
      message: 'This package is not in our verified registry. Proceed with caution.'
    });
  }

  res.send({
    status: 'OFFICIAL',
    message: 'Verified package found.',
    officialHash: app.fileHash, // Client can use this to verify download integrity
    storeUrl: app.storeUrl
  });
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