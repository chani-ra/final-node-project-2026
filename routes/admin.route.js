import express from 'express';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import UserController from '../controllers/UserController.js';

const router = express.Router();

// Admin-only routes - יצירת משתמשים חדשים
router.post('/create-admin', authenticateToken, requireAdmin, UserController.createAdmin);
router.post('/create-teacher', authenticateToken, requireAdmin, UserController.createTeacher);

export default router;

