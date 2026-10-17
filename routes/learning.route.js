import { Router } from "express";
import { authenticateToken, requireAdmin, requireStudent } from "../middlewares/auth.middleware.js";
import { aiLimiter } from "../middlewares/rateLimit.middleware.js";
import { LearningController } from "../controllers/learning.controller.js";

const router = Router();
router.use(authenticateToken);
router.get("/categories", requireStudent, LearningController.categories);
router.get("/providers", requireStudent, LearningController.providers);
router.get("/admin/history", requireAdmin, LearningController.adminHistory);
router.get("/history", requireStudent, LearningController.myHistory);
router.get("/history/:id", requireStudent, LearningController.detail);
router.post("/generate", requireStudent, aiLimiter, LearningController.create);
export default router;
