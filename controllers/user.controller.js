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
    },    // עדכון פרופיל - כל משתמש יכול לעדכן את עצמו
    updateProfile: async (req, res) => {
        try {
            const { username, phone, age } = req.body;
            
            const updatedUser = await UserService.updateOwnProfile(req.user.id, { username, phone, age });
            
            res.json({
                success: true,
                message: 'Profile updated successfully',
                user: UserService.filterUserData(updatedUser)
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
                user: UserService.filterUserData(updatedUser)
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    },

    // יצירת מנהל חדש - רק למנהלים קיימים
    createAdmin: async (req, res) => {
        try {
            const userData = req.body;
            const currentUser = req.user; // מגיע מה-middleware
            
            const newAdmin = await UserService.addAdminByAdmin(userData, currentUser);
            
            res.status(201).json({
                success: true,
                message: 'Admin created successfully',
                user: UserService.filterUserData(newAdmin)
            });
        } catch (error) {
            res.status(403).json({ 
                success: false, 
                message: error.message 
            });
        }
    },

    // יצירת מורה חדש - רק למנהלים
    createTeacher: async (req, res) => {
        try {
            const userData = req.body;
            const currentUser = req.user; // מגיע מה-middleware
            
            const newTeacher = await UserService.addTeacherByAdmin(userData, currentUser);
            
            res.status(201).json({
                success: true,
                message: 'Teacher created successfully', 
                user: UserService.filterUserData(newTeacher)
            });
        } catch (error) {
            res.status(403).json({ 
                success: false, 
                message: error.message 
            });
        }
    },
};

export default UserController;
