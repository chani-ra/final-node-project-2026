import { Router } from "express";
import ExerciseController from "../controllers/exercise.controller.js";
import { exerciseSubmissionController } from "../controllers/exerciseSubmission.controller.js";
import { aiLimiter } from "../middlewares/rateLimit.middleware.js";
import {
  authenticateToken,
  requireTeacher,
} from "../middlewares/auth.middleware.js";

const router = Router();

// יצירת תרגיל ידני או תרגיל שנוצר בעזרת AI
router.post(
  "/create",
  authenticateToken,
  requireTeacher,
  ExerciseController.createExercise
);

// קבלת כל התרגילים הציבוריים
router.get("/", ExerciseController.getAllExercises);

// קבלת תרגילים של מורה
router.get(
  "/teacher/:teacherId",
  authenticateToken,
  requireTeacher,
  ExerciseController.getExercisesByTeacher
);

// קבלת תרגיל לפי מזהה
router.get("/:exerciseId", authenticateToken, ExerciseController.getExerciseById);

// עדכון תרגיל
router.put(
  "/:exerciseId",
  authenticateToken,
  requireTeacher,
  ExerciseController.updateExercise
);

// מחיקת תרגיל
router.delete(
  "/:exerciseId",
  authenticateToken,
  requireTeacher,
  ExerciseController.deleteExercise
);

router.get("/:exerciseId/submission", authenticateToken, exerciseSubmissionController.latest);
router.post("/:exerciseId/submit", authenticateToken, aiLimiter, exerciseSubmissionController.submit);

// סימון תרגיל כהושלם
router.post(
  "/:exerciseId/complete",
  authenticateToken,
  ExerciseController.markCompleted
);

export default router;