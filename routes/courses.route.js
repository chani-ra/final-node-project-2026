import { Router } from "express";

import CourseController from "../controllers/courses.controller.js";
import {
  authenticateToken,
  requireTeacher,
} from "../middlewares/auth.middleware.js";

const router = Router();

// Personalized courses
router.post(
  "/create-personalized",
  authenticateToken,
  CourseController.createPersonalizedCourse
);

router.post(
  "/:courseId/refresh-personalized",
  authenticateToken,
  CourseController.refreshPersonalizedCourse
);

// Student courses
router.get(
  "/enrolled",
  authenticateToken,
  CourseController.getEnrolledCourses
);

router.get(
  "/recommended",
  authenticateToken,
  CourseController.getRecommendedCourses
);

router.post(
  "/:courseId/enroll",
  authenticateToken,
  CourseController.enrollInCourse
);

// Teacher course management
router.post(
  "/create",
  authenticateToken,
  requireTeacher,
  CourseController.createCourse
);

router.put(
  "/:courseId",
  authenticateToken,
  requireTeacher,
  CourseController.updateCourse
);

router.delete(
  "/:courseId",
  authenticateToken,
  requireTeacher,
  CourseController.deleteCourse
);

// Course details
router.get(
  "/:courseId",
  authenticateToken,
  CourseController.getCourseById
);

export default router;