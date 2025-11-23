const multer = require('multer');
const path = require('path');
const fs = require('fs');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { fileUploadService } = require('../services');
const logger = require('../config/logger');

// 1. Ensure upload directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. Configure Storage (Disk Storage for Prototype)
// We save files locally. In a real production app, you might swap this for AWS S3.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: fieldname-timestamp-random.ext
    // e.g., faceVideo-1715423423-832.mp4
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// 3. File Filter Logic
// This ensures hackers don't upload .exe files or scripts to your server.
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Strategy 1: Identity Verification Files
  if (file.fieldname === 'faceVideo' || file.fieldname === 'voiceAudio' || file.fieldname === 'idDocument') {
    if (!['.mp4', '.webm', '.mov', '.wav', '.mp3', '.jpg', '.jpeg', '.png'].includes(ext)) {
      return cb(new ApiError(httpStatus.BAD_REQUEST, 'Invalid format for identity check. Allowed: Video, Audio, Image'));
    }
  }
  
  // Strategy 2: App Checker Files
  else if (file.fieldname === 'appFile') {
    if (ext !== '.apk') {
      return cb(new ApiError(httpStatus.BAD_REQUEST, 'Invalid format. Only .apk files are allowed for App Checking'));
    }
  }
  
  // Strategy 3: Grievance Attachments
  else if (file.fieldname === 'evidence' || file.fieldname === 'attachments') {
    if (!['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'].includes(ext)) {
      return cb(new ApiError(httpStatus.BAD_REQUEST, 'Invalid evidence format. Allowed: Images and Documents'));
    }
  }

  cb(null, true);
};

// 4. Initialize Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // Limit: 50MB (Accommodates larger APKs and short videos)
  },
});

/**
 * Middleware to track uploaded files in database
 * This should be used after multer middleware
 */
const trackFileUpload = (uploadType) => {
  return async (req, res, next) => {
    try {
      // Only process if files were uploaded
      if (!req.file && (!req.files || Object.keys(req.files).length === 0)) {
        return next();
      }

      const userId = req.user ? req.user.id : null;
      
      // Handle single file upload
      if (req.file) {
        const fileRecord = await fileUploadService.createFileUpload(req.file, {
          uploadType,
          uploadedBy: userId,
          metadata: {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
          },
        });
        
        // Attach file record to request for later use
        req.fileRecord = fileRecord;
      }
      
      // Handle multiple files upload
      if (req.files) {
        const fileRecords = [];
        
        // Handle array of files or object with multiple fields
        if (Array.isArray(req.files)) {
          // multer array
          for (const file of req.files) {
            const fileRecord = await fileUploadService.createFileUpload(file, {
              uploadType,
              uploadedBy: userId,
              metadata: {
                fieldname: file.fieldname,
                originalname: file.originalname,
              },
            });
            fileRecords.push(fileRecord);
          }
        } else {
          // multer fields - req.files is an object
          for (const fieldname in req.files) {
            const filesArray = req.files[fieldname];
            for (const file of filesArray) {
              const fileRecord = await fileUploadService.createFileUpload(file, {
                uploadType,
                uploadedBy: userId,
                metadata: {
                  fieldname: file.fieldname,
                  originalname: file.originalname,
                },
              });
              fileRecords.push(fileRecord);
            }
          }
        }
        
        // Attach file records to request
        req.fileRecords = fileRecords;
      }

      next();
    } catch (error) {
      logger.error(`Error tracking file upload: ${error.message}`);
      // Continue even if tracking fails - don't block the upload
      next();
    }
  };
};

module.exports = upload;
module.exports.trackFileUpload = trackFileUpload;