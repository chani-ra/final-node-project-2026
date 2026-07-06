import { Router } from "express";
import StudentTaskController from "../controllers/task.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticateToken);

router.get("/my", StudentTaskController.getMyTasks);

router.post("/", StudentTaskController.createMyTask);

router.post("/many", StudentTaskController.createManyMyTasks);

router.patch("/:id/complete", StudentTaskController.completeTask);

router.patch("/:id/review", StudentTaskController.submitForReview);

router.delete("/:id", StudentTaskController.deleteMyTask);

export default router;