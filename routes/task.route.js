import { Router } from "express";
import StudentTaskController from "../controllers/task.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticateToken);

// קבלת המשימות שלי
router.get("/my", StudentTaskController.getMyTasks);

// יצירת משימה אחת
router.post("/", StudentTaskController.createMyTask);

// יצירת כמה משימות יחד
router.post("/many", StudentTaskController.createManyMyTasks);

// סימון כבוצע
router.patch("/:id/complete", StudentTaskController.completeTask);

// שליחה לבדיקה
router.patch("/:id/review", StudentTaskController.submitForReview);

// מחיקה
router.delete("/:id", StudentTaskController.deleteMyTask);

export default router;