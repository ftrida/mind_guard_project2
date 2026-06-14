import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

// FIX F-07: Use UUID-based filenames — removes extension as an attack vector.
// The stored filename has no user-controlled component.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Map original extension to a safe, controlled value
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExtMap = {
      '.jpeg': '.jpg', '.jpg': '.jpg', '.png': '.png',
      '.gif': '.gif',  '.webp': '.webp', '.pdf': '.pdf',
      '.csv': '.csv',  '.xlsx': '.xlsx'
    };
    const safeExt = safeExtMap[ext] || '.bin';
    // UUID + safe extension — no user-controlled characters in the filename
    const uniqueName = `${crypto.randomUUID()}${safeExt}`;
    cb(null, uniqueName);
  }
});

// FIX F-07: Validate MIME type against a strict, server-controlled allowlist.
// Client-supplied file.mimetype is cross-checked against allowed types only.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);

function checkFileType(file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = new Set(['.jpeg', '.jpg', '.png', '.gif', '.webp', '.pdf', '.csv', '.xlsx']);

  if (!allowedExts.has(ext) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error('Unsupported file format. Only images, PDF, CSV, and XLSX are allowed.'));
  }
  cb(null, true);
}

export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
});
