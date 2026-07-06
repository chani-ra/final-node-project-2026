import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', authenticateToken, ProfileController.getUserProfile);

router.post('/progress', authenticateToken, ProfileController.updateCourseProgress);

router.put('/settings', authenticateToken, ProfileController.updateProfileSettings);

export default router;