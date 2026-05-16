import { Router } from 'express';
import { QuizController } from '../controllers/quiz.controller.js';
import { authenticateToken, requireTeacher } from '../middlewares/auth.middleware.js';

const router = Router();

// ➕ יצירת בחן לקורס (רק מורים)
router.post('/create', authenticateToken, requireTeacher, QuizController.createQuiz);

// 📖 קבלת בחנים של קורס ספציפי (תלמידים רשומים + מורים)
router.get('/course/:courseId', authenticateToken, QuizController.getQuizzesByCourse);

// 📝 הגשת בחן (תלמידים רשומים)
router.post('/:quizId/submit', authenticateToken, QuizController.submitQuiz);

// 📊 קבלת תוצאות הבחנים של המשתמש
router.get('/results/my', authenticateToken, QuizController.getUserQuizResults);

// 👨‍🏫 קבלת בחנים של מורה
router.get('/teacher/my', authenticateToken, requireTeacher, QuizController.getTeacherQuizzes);

export default router;