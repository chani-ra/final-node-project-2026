import { Router } from "express";
import LessonController from "../controllers/lesson.controller.js";
import {
  authenticateToken,
  requireTeacher,
} from "../middlewares/auth.middleware.js";
import upload from "../config/multer.js";

const router = Router();

/**
 * TEACHER / ADMIN ROUTES
 */

// העלאת שיעור חדש
router.post(
  "/upload",
  authenticateToken,
  requireTeacher,
  upload.single("video"),
  LessonController.uploadLesson
);

// עדכון שיעור
router.put(
  "/:lessonId",
  authenticateToken,
  requireTeacher,
  upload.single("video"),
  LessonController.updateLesson
);

// מחיקת שיעור
router.delete(
  "/:lessonId",
  authenticateToken,
  requireTeacher,
  LessonController.deleteLesson
);

// סטטיסטיקות של מורה
router.get(
  "/stats/:instructorId",
  authenticateToken,
  requireTeacher,
  LessonController.getInstructorStats
);

// כל השיעורים של מורה
router.get(
  "/instructor/:instructorId",
  authenticateToken,
  requireTeacher,
  LessonController.getInstructorLessons
);

/**
 * PUBLIC ROUTES
 */

// חיפוש שיעורים ציבוריים
router.get(
  "/search",
  LessonController.searchLessons
);

// קבלת שיעור ציבורי
router.get(
  "/:lessonId",
  LessonController.getLessonById
);

// צפייה בווידאו של שיעור ציבורי
router.get(
  "/:lessonId/stream",
  LessonController.streamLesson
);

/**
 * AUTHENTICATED STUDENT ROUTES
 */

// הרשמה לשיעור
router.post(
  "/:lessonId/enroll",
  authenticateToken,
  LessonController.enrollStudent
);

export default router;