import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { QuizController } from "../controllers/quiz.controller.js";

const router = Router();

router.use(authenticateToken);

// מורה יוצרת בוחן
router.post("/", QuizController.createQuiz);

// בחנים של קורס
router.get("/course/:courseId", QuizController.getQuizzesByCourse);

// תוצאות בחנים של תלמידה
router.get("/my-results", QuizController.getUserQuizResults);

// בחנים של מורה
router.get("/teacher/my", QuizController.getTeacherQuizzes);

// בוחן יחיד לפי מזהה
// חשוב: חייב להיות אחרי /my-results ו-/teacher/my
// כדי ש-Express לא יחשוב ש-"my-results" הוא quizId
router.get("/:quizId", QuizController.getQuizById);

// עריכת בוחן
router.put("/:quizId", QuizController.updateQuiz);

// פרסום / החזרה לטיוטה של בוחן
router.patch("/:quizId/publish", QuizController.updateQuizPublishStatus);

// מחיקת בוחן
router.delete("/:quizId", QuizController.deleteQuiz);

// הגשת בוחן
router.post("/:quizId/submit", QuizController.submitQuiz);

export default router;