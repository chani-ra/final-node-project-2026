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
router.post('/create-first-admin', AuthController.createFirstAdmin);

// User routes - מוגנים
router.get('/profile', authenticateToken, UserController.getProfile);
router.put('/profile', authenticateToken, UserController.updateProfile);
router.get('/', authenticateToken, requireAdmin, UserController.getAllUsers);
router.delete('/:userId', authenticateToken, requireAdmin, UserController.deleteUser);
router.put('/:userId/promote', authenticateToken, requireAdmin, UserController.promoteToTeacher);

// Admin-only routes - יצירת משתמשים חדשים
router.post('/admin/create-admin', authenticateToken, requireAdmin, UserController.createAdmin);
router.post('/admin/create-teacher', authenticateToken, requireAdmin, UserController.createTeacher);

export default router;
