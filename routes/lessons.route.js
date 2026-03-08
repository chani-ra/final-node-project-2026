import { Router } from "express";
import LessonController from "../controllers/lesson.controller.js";
import { authenticateToken, requireTeacher } from "../middlewares/auth.middleware.js";
import upload from "../config/multer.js";

const router = Router();

/**
 * ⚠️ TEACHER ROUTES - חייבים להיות ראשונים!
 */

// ➕ העלאת שיעור - MUST BE FIRST
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

/**
 * PUBLIC ROUTES - אחרי זה
 */

// 🔍 חיפוש שיעורים
router.get('/search', LessonController.searchLessons);

// 📊 סטטיסטיקות מורה
router.get('/stats/:instructorId', LessonController.getInstructorStats);

// 📖 קבלת שיעור ספציפי
router.get('/:lessonId', LessonController.getLessonById);

// 📺 השמעת ווידאו בזרם
router.get('/:lessonId/stream', LessonController.streamLesson);

/**
 * AUTHENTICATED ROUTES
 */

// 📚 קבלת שיעורים של מורה
router.get(
  '/instructor/:instructorId',
  authenticateToken,
  LessonController.getInstructorLessons
);

// 👤 הרשמה לשיעור
router.post(
  '/:lessonId/enroll',
  authenticateToken,
  LessonController.enrollStudent
);

export default router;