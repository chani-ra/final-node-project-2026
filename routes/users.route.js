import { Router } from "express";   
import { AuthController } from "../controllers/auth.controller.js";
import { UserController } from "../controllers/user.controller.js"; // תיקון נתיב
import { authenticateToken, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Authentication routes - הבסיס שעובד!
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);  
router.post('/refresh-token', AuthController.refreshToken);

// זמני לפיתוח - יצירת admin ראשוני
router.post('/create-first-admin', UserController.createFirstAdmin);

// User routes - מוגנים
router.get('/profile', authenticateToken, UserController.getProfile);
router.get('/all', authenticateToken, requireAdmin, UserController.getAllUsers);

export default router;
