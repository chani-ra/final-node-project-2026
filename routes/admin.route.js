import {Router} from 'express';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware.js';

import { UserController } from "../controllers/user.controller.js"; // תיקון נתיב

const router = Router();

// Admin-only routes - יצירת משתמשים חדשים
router.post('/create-admin', authenticateToken, requireAdmin, UserController.createAdmin);
router.post('/create-teacher', authenticateToken, requireAdmin, UserController.createTeacher);

router.delete('/:userId', authenticateToken, requireAdmin, UserController.deleteUser);

router.post('/send-test-email', authenticateToken, requireAdmin, UserController.sendTestEmail);


export default router;

