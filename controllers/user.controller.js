import UserService from '../service/users.service.js';

export const UserController = {
    // קבלת פרופיל - כל משתמש יכול לראות את הפרופיל שלו
    getProfile: async (req, res) => {
        try {
            // req.user כבר מוכן על ידי authenticateToken middleware!
            const user = await UserService.getUserById(req.user.id);
            
            res.json({
                success: true,
                user: {
                    id: user._id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    createdAt: user.createdAt
                }
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    },

    // עדכון פרופיל - כל משתמש יכול לעדכן את עצמו
    updateProfile: async (req, res) => {
        try {
            const { username } = req.body;
            
            // req.user.id זמין בזכות המידלוואר!
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

    // רשימת כל המשתמשים - רק למנהלים (מוגן על ידי requireAdmin)
    getAllUsers: async (req, res) => {
        try {
            // אין צורך לבדוק הרשאות - requireAdmin כבר עשה את זה!
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
            
            // בדיקה שלא מוחקים את עצמך
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
    }
};

export default UserController;
