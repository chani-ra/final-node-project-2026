import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// יצירת תיקייה לשמירת ווידאו זמנית (אם לא משתמש ב-S3)
const uploadDir = path.join(__dirname, '../uploads/videos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// הגדרות Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  // קבלת רק קבצי ווידאו
  const allowedMimetypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
  const allowedExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimetypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `קבצי ווידאו בלבד מותרים. קבצים מתקבלים: ${allowedExtensions.join(', ')}`
      ),
      false
    );
  }
};

// הגדרה סופית של Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
});

export default upload;
