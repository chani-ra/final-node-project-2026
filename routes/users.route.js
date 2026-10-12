import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { UserController } from "../controllers/user.controller.js";
import {
  authenticateToken,
  requireAdmin,
} from "../middlewares/auth.middleware.js";
import { requireAdminSetupKey } from "../middlewares/bootstrap.middleware.js";

const router = Router();

// Authentication
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/refresh-token", AuthController.refreshToken);

// One-time admin bootstrap
router.post(
  "/create-first-admin",
  requireAdminSetupKey,
  AuthController.createFirstAdmin
);

// User profile
router.get("/profile", authenticateToken, UserController.getProfile);
router.put("/profile", authenticateToken, UserController.updateProfile);

// Admin user management
router.get(
  "/",
  authenticateToken,
  requireAdmin,
  UserController.getAllUsers
);

router.put(
  "/:userId/role",
  authenticateToken,
  requireAdmin,
  UserController.updateUserRole
);

router.put(
  "/:userId/promote",
  authenticateToken,
  requireAdmin,
  UserController.promoteToTeacher
);

router.delete(
  "/:userId",
  authenticateToken,
  requireAdmin,
  UserController.deleteUser
);

export default router;