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

// עזרה במילון
router.post("/dictionary-helper", AiController.dictionaryHelper);

// תרגול שיחה מול AI
router.post("/conversation", AiController.conversation);

// יצירת תרגילים
router.post("/generate-exercise", AiController.generateExercise);

// בדיקת חיבור ומתן פידבק
router.post("/check-essay", AiController.checkEssay);

// טיפים ללמידה
router.get("/study-tips", AiController.getStudyTips);

// יצירת בוחן AI לתרגול
router.post("/generate-quiz", AiController.generateQuiz);

// יצירת תוכנית למידה
router.get("/learning-plan", AiController.generateLearningPlan);

// מפת יכולות חכמה
router.post("/brain-map", AiController.generateBrainMap);

// מאמן אישי
router.post("/coach", AiController.generateCoachPlan);

// היסטוריית המאמן
router.get("/coach/history", AiController.getCoachHistory);

export default router;