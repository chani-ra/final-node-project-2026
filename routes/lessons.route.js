import { Router } from "express";
import LessonController from "../controllers/lesson.controller.js";
import { authenticateToken, requireTeacher } from "../middlewares/auth.middleware.js";
import upload from "../config/multer.js";

const router = Router();



router.post(
  '/upload',
  authenticateToken,
  requireTeacher,
  upload.single('video'),
  LessonController.uploadLesson
);

router.put(
  '/:lessonId',
  authenticateToken,
  requireTeacher,
  upload.single('video'),
  LessonController.updateLesson
);

router.delete(
  '/:lessonId',
  authenticateToken,
  requireTeacher,
  LessonController.deleteLesson
);


router.get('/search', LessonController.searchLessons);

router.get('/stats/:instructorId', LessonController.getInstructorStats);

router.get('/:lessonId', LessonController.getLessonById);

router.get('/:lessonId/stream', LessonController.streamLesson);

/**
 * AUTHENTICATED ROUTES
 */

router.get(
  '/instructor/:instructorId',
  authenticateToken,
  LessonController.getInstructorLessons
);

router.post(
  '/:lessonId/enroll',
  authenticateToken,
  LessonController.enrollStudent
);

export default router;