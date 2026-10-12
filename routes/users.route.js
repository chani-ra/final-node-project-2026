import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { UserController } from "../controllers/user.controller.js";
import { authenticateToken, requireAdmin } from "../middlewares/auth.middleware.js";
import { requireAdminSetupKey } from "../middlewares/bootstrap.middleware.js";
import { authLimiter, registrationLimiter } from "../middlewares/rateLimit.middleware.js";
import { validateBody } from "../middlewares/validation.middlewares.js";
import {
  userValidationSchema,
  loginValidationSchema,
  refreshTokenValidationSchema,
} from "../validation/user.validation.js";

const router = Router();

router.post(
  "/register",
  registrationLimiter,
  validateBody(userValidationSchema),
  AuthController.register
);

router.post(
  "/login",
  authLimiter,
  validateBody(loginValidationSchema),
  AuthController.login
);

router.post(
  "/refresh-token",
  validateBody(refreshTokenValidationSchema),
  AuthController.refreshToken
);

router.post(
  "/create-first-admin",
  requireAdminSetupKey,
  validateBody(userValidationSchema),
  AuthController.createFirstAdmin
);

router.get("/profile", authenticateToken, UserController.getProfile);

router.put("/profile", authenticateToken, UserController.updateProfile);

router.get("/", authenticateToken, requireAdmin, UserController.getAllUsers);

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