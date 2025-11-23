import { Router } from "express";   
import { AuthController } from "../controllers/auth.controller.js";
import { UserController } from "../controllers/user.controller.js";
import { authenticateToken, requireAdmin } from "../middlewares/auth.middleware.js";
import bcrypt from 'bcryptjs';
import User from '../models/users.model.js';

const router = Router();

// Authentication routes - הבסיס שעובד!
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);  
router.post('/refresh-token', AuthController.refreshToken);

// User routes - עכשיו עם הקונטרולר המלא!
router.get('/profile', authenticateToken, UserController.getProfile);
router.get('/all', authenticateToken, requireAdmin, UserController.getAllUsers);

// זמני - ליצירת admin ראשוני (תמחקי אחר כך!)
router.post('/create-first-admin', async (req, res) => {
    try {
        const userData = req.body;
        userData.role = 'admin';
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        userData.password = hashedPassword;
        
        const user = new User(userData);
        const savedUser = await user.save();
        
        res.status(201).json({
            success: true,
            message: 'First admin created successfully',
            user: {
                id: savedUser._id,
                email: savedUser.email,
                role: savedUser.role
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

export default router;
