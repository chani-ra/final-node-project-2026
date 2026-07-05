import { Router } from "express";
import { authenticateToken, requireAdmin } from "../middlewares/auth.middleware.js";
import { UserController } from "../controllers/user.controller.js";
import { getAdminStats } from "../controllers/adminStats.controller.js";

const router = Router();

router.get("/stats", authenticateToken, requireAdmin, getAdminStats);

router.post("/create-admin", authenticateToken, requireAdmin, UserController.createAdmin);

router.post("/create-teacher", authenticateToken, requireAdmin, UserController.createTeacher);

router.delete("/:userId", authenticateToken, requireAdmin, UserController.deleteUser);

export default router;