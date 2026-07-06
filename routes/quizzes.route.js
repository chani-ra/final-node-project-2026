import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { QuizController } from "../controllers/quiz.controller.js";

const router = Router();

router.use(authenticateToken);

router.post("/", QuizController.createQuiz);

router.get("/course/:courseId", QuizController.getQuizzesByCourse);

router.get("/my-results", QuizController.getUserQuizResults);

router.get("/teacher/my", QuizController.getTeacherQuizzes);


router.get("/:quizId", QuizController.getQuizById);

router.put("/:quizId", QuizController.updateQuiz);

router.patch("/:quizId/publish", QuizController.updateQuizPublishStatus);

router.delete("/:quizId", QuizController.deleteQuiz);

router.post("/:quizId/submit", QuizController.submitQuiz);

export default router;