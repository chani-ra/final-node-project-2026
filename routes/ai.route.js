import { Router } from "express";
import AiController from "../controllers/ai.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { aiLimiter } from "../middlewares/rateLimit.middleware.js";

const router = Router();

router.use(authenticateToken);
router.use(aiLimiter);

router.post("/grammar-correct", AiController.correctGrammar);
router.post("/translate", AiController.translateText);
router.post("/dictionary-helper", AiController.dictionaryHelper);
router.post("/conversation", AiController.conversation);
router.post("/generate-exercise", AiController.generateExercise);
router.post("/check-essay", AiController.checkEssay);

router.get("/study-tips", AiController.getStudyTips);
router.post("/generate-quiz", AiController.generateQuiz);
router.get("/learning-plan", AiController.generateLearningPlan);
router.post("/brain-map", AiController.generateBrainMap);

router.post("/coach", AiController.generateCoachPlan);
router.get("/coach/history", AiController.getCoachHistory);

export default router;