import { Router } from 'express';
import AiController from '../controllers/ai.controller.js'; // 👈 תיקון: ייבוא דיפולטיבי ללא סוגריים מסולסלים
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// 🔒 כל ראוטי ה-AI דורשים אימות טוקן אוטומטית
router.use(authenticateToken);

// 📝 1. בדיקת דקדוק
router.post('/grammar-correct', AiController.correctGrammar);

// 🌐 2. תרגום טקסט (הפיצ'ר החדש!)
router.post('/translate', AiController.translateText);

// 💬 3. תרגול שיחה
router.post('/conversation', AiController.conversation);

// 🎯 4. יצירת תרגילים
router.post('/generate-exercise', AiController.generateExercise);

// ✍️ 5. בדיקת חיבור חופשי ומתן פידבק
router.post('/check-essay', AiController.checkEssay); 

// 💡 6. קבלת טיפים ללמידה
router.get('/study-tips', AiController.getStudyTips);

// 🧠 7. יצירת בחן אמריקאי אוטומטי
router.post('/generate-quiz', AiController.generateQuiz);

// 📈 8. יצירת תוכנית למידה אישית
router.get('/learning-plan', AiController.generateLearningPlan);

export default router;