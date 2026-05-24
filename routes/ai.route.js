import { Router } from 'express';
import { AiController } from '../controllers/ai.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// 🔒 כל ראוטי ה-AI דורשים אימות
router.use(authenticateToken);

// 📝 בדיקת דקדוק
router.post('/grammar-correct', AiController.correctGrammar);

// 💬 תרגול שיחה
router.post('/conversation', AiController.conversation);

// 🎯 יצירת תרגילים
router.post('/generate-exercise', AiController.generateExercise);

// ✍️ בדיקת חיבור חופשי ומתן פידבק
router.post('/writing-feedback', AiController.checkEssay); 

// 💡 קבלת טיפים ללמידה
router.get('/study-tips', AiController.getStudyTips);

// 🧠 יצירת בחן אמריקאי אוטומטי
router.post('/generate-quiz', AiController.generateQuiz);

// 📈 יצירת תוכנית למידה אישית
router.get('/learning-plan', AiController.generateLearningPlan);

export default router;