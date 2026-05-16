import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// 👤 קבלת פרופיל אישי מלא
router.get('/', authenticateToken, ProfileController.getUserProfile);

// 📊 עדכון התקדמות בקורס
router.post('/progress', authenticateToken, ProfileController.updateCourseProgress);

// ⚙️ עדכון הגדרות פרופיל
router.put('/settings', authenticateToken, ProfileController.updateProfileSettings);

export default router;