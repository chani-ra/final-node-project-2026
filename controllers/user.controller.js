import UserService from '../service/users.service.js';

export const UserController = {
    // קבלת פרופיל - משתמש בפונקציה המסוננת מהסרביס
    getProfile: async (req, res) => {
        try {
            const user = await UserService.getUserProfile(req.user.id);
            res.status(200).json({
                success: true,
                user: user
            });
        } catch (error) {
            if (error.message === 'User not found') {
                return res.status(404).json({ message: error.message });
            }
            res.status(500).json({ message: error.message });
        }
    },

    // עדכון פרופיל - כל משתמש יכול לעדכן את עצמו
    updateProfile: async (req, res) => {
        try {
            const { username } = req.body;
            
            const updatedUser = await UserService.updateUser(req.user.id, { username });
            
            res.json({
                success: true,
                message: 'Profile updated successfully',
                user: {
                    id: updatedUser._id,
                    email: updatedUser.email,
                    username: updatedUser.username,
                    role: updatedUser.role
                }
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    },

    // רשימת כל המשתמשים - מסנן את הנתונים
    getAllUsers: async (req, res) => {
        try {
            const users = await UserService.getAllUsers();
            
            res.json({
                success: true,
                users: users.map(user => ({
                    id: user._id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    createdAt: user.createdAt
                }))
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    },

    // מחיקת משתמש - רק למנהלים
    deleteUser: async (req, res) => {
        try {
            const { userId } = req.params;
            
            if (userId === req.user.id) {
                return res.status(400).json({
                    success: false,
                    message: "Cannot delete your own account"
                });
            }
            
            await UserService.deleteUser(userId);
            
            res.json({
                success: true,
                message: 'User deleted successfully'
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    },

    // שדרוג משתמש למורה - רק למנהלים
    promoteToTeacher: async (req, res) => {
        try {
            const { userId } = req.params;
            
            const updatedUser = await UserService.updateUser(userId, { role: 'teacher' });
            
            res.json({
                success: true,
                message: 'User promoted to teacher successfully',
                user: {
                    id: updatedUser._id,
                    email: updatedUser.email,
                    username: updatedUser.username,
                    role: updatedUser.role
                }
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    },

    // יצירת admin ראשוני (זמני לפיתוח)
    createFirstAdmin: async (req, res) => {
        try {
            const admin = await UserService.createFirstAdmin(req.body);
            res.status(201).json({
                success: true,
                message: 'First admin created successfully',
                user: {
                    id: admin._id,
                    email: admin.email,
                    role: admin.role
                }
            });
        } catch (error) {
            res.status(400).json({ 
                success: false, 
                message: error.message 
            });
        }
    }
};

export default UserController;
