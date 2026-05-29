import { Router } from "express";
import DictionaryController from "../controllers/dictionary.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticateToken);

// קבלת מילים אישיות
router.get("/my", DictionaryController.getMyWords);

// הוספת מילה
router.post("/", DictionaryController.addWord);

// סימון יודעת / בתרגול
router.patch("/:id/toggle-mastered", DictionaryController.toggleMastered);

// מחיקת מילה
router.delete("/:id", DictionaryController.deleteWord);

export default router;