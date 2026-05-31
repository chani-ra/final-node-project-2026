import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import CourseProgressController from "../controllers/courseProgress.controller.js";

const router = Router();

router.use(authenticateToken);

// חשוב: summary לפני :courseId
router.get("/summary/my", CourseProgressController.getMyCoursesProgressSummary);

router.get("/:courseId", CourseProgressController.getMyCourseProgress);

router.patch(
  "/:courseId/item",
  CourseProgressController.toggleCourseItemProgress
);

router.patch(
  "/:courseId/recalculate",
  CourseProgressController.recalculateCourseProgress
);

export default router;