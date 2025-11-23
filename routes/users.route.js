import { Router } from "express";   
import { AuthController } from "../controllers/auth.controller.js";
import { authenticateToken, requireAdmin, requireTeacher } from "../middlewares/auth.middleware.js";

const router = Router();

// Authentication routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);

// Protected routes examples (for testing)
router.get('/profile', authenticateToken, (req, res) => {
    res.json({ message: 'Profile data', user: req.user });
});

router.get('/admin-only', authenticateToken, requireAdmin, (req, res) => {
    res.json({ message: 'Admin only content' });
});

router.get('/teacher-content', authenticateToken, requireTeacher, (req, res) => {
    res.json({ message: 'Teacher content' });
});

export default router;
