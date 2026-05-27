import { Router } from "express";   
import { AuthController } from "../controllers/auth.controller.js";
import { UserController } from "../controllers/user.controller.js"; // תיקון נתיב
import { authenticateToken, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();
// קודם נגדיר את הנתיבים הציבוריים (אלו שלא צריכים אימות)
router.post('/register', AuthController.register);
router.post('/login', AuthController.login); 
router.post('/refresh-token', AuthController.refreshToken);
router.post('/create-first-admin', AuthController.createFirstAdmin);

// רק אחרי זה נגדיר את הנתיבים שדורשים אימות (ככה הם לא יפריעו ללוגין)
router.get('/profile', authenticateToken, UserController.getProfile);
router.put('/profile', authenticateToken, UserController.updateProfile);
router.get('/', authenticateToken, requireAdmin, UserController.getAllUsers);
router.put('/:userId/promote', authenticateToken, requireAdmin, UserController.promoteToTeacher);
router.delete('/:userId', authenticateToken, requireAdmin, UserController.deleteUser);
export default router;
