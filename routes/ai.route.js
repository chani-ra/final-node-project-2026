import { Router } from "express";
import AiController from "../controllers/ai.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

// כל ראוטי ה-AI דורשים משתמש מחובר
router.use(authenticateToken);

// תיקון דקדוק
router.post("/grammar-correct", AiController.correctGrammar);

// תרגום טקסט
router.post("/translate", AiController.translateText);

// עזרה במילון - מציאת מילים דומות, הסברים וכו'
router.post("/dictionary-helper", AiController.dictionaryHelper);

// תרגול שיחה אמיתי מול AI
router.post("/conversation", AiController.conversation);

// יצירת תרגילים
router.post("/generate-exercise", AiController.generateExercise);

// בדיקת חיבור ומתן פידבק
router.post("/check-essay", AiController.checkEssay);

// קבלת טיפים ללמידה
router.get("/study-tips", AiController.getStudyTips);

// יצירת בחן אמריקאי אוטומטי
router.post("/generate-quiz", AiController.generateQuiz);

// יצירת תוכנית למידה כללית
router.get("/learning-plan", AiController.generateLearningPlan);

// מאמן אישי לתלמידה
router.post("/coach", AiController.generateCoachPlan);

// היסטוריית מאמן אישי
router.get("/coach/history", AiController.getCoachHistory);

// שמירת תוצאת בוחן
router.post("/quiz-result", AiController.saveQuizResult);

export default router;