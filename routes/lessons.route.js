import { Router } from "express";
import LessonController from "../controllers/lesson.controller.js";
import { authenticateToken, requireTeacher } from "../middlewares/auth.middleware.js";
import upload from "../config/multer.js";

const router = Router();

/**
 * PUBLIC ROUTES - כל משתמש יכול לגשת
 */

// 🔍 חיפוש שיעורים
router.get('/search', LessonController.searchLessons);

// 📊 סטטיסטיקות מורה (PUBLIC)
router.get('/stats/:instructorId', LessonController.getInstructorStats);

// 📖 קבלת שיעור ספציפי
router.get('/:lessonId', LessonController.getLessonById);

// 📺 השמעת ווידאו בזרם
router.get('/:lessonId/stream', LessonController.streamLesson);

/**
 * AUTHENTICATED ROUTES - צריך להיות מחובר
 */

// 📚 קבלת שיעורים של מורה ספציפי
router.get(
  '/instructor/:instructorId',
  authenticateToken,
  LessonController.getInstructorLessons
);

// 👤 הרשמה לשיעור (סטודנט)
router.post(
  '/:lessonId/enroll',
  authenticateToken,
  LessonController.enrollStudent
);

/**
 * TEACHER ROUTES - רק מורים
 */

// ➕ העלאת שיעור חדש
router.post(
  '/upload',
  authenticateToken,
  requireTeacher,
  upload.single('video'),
  LessonController.uploadLesson
);

// ✏️ עדכון שיעור
router.put(
  '/:lessonId',
  authenticateToken,
  requireTeacher,
  upload.single('video'),
  LessonController.updateLesson
);

// 🗑️ מחיקת שיעור
router.delete(
  '/:lessonId',
  authenticateToken,
  requireTeacher,
  LessonController.deleteLesson
);

export default router;