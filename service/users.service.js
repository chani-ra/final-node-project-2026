import User from '../models/users.model.js';
import bcrypt from 'bcryptjs';

const createUser = async (userData) => {
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) throw new Error("User already exists");

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    userData.password = hashedPassword;
    
    const user = new User(userData);
    return await user.save();
}


const UserService = {

    // Helper function לסינון נתוני משתמש
    filterUserData: (user) => ({
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt
    }),

    register: async (userData) => {

        userData.role = 'user';
        return await createUser(userData);
    },
    
    addAdminByAdmin: async (userData, currentUser) => {
        if (!currentUser || currentUser.role !== 'admin') {
            throw new Error("Access denied. Only admins can add users.");
        }
        userData.role = "admin";
        return await createUser(userData);
    },
    
    addTeacherByAdmin: async (userData, currentUser) => {
        if (!currentUser || currentUser.role !== 'admin') {
            throw new Error("Access denied. Only admins can add users.");
        }
        userData.role = "teacher";
        return await createUser(userData);
    },

    login: async (email, password) => {
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error("Invalid credentials");
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error("Invalid credentials");
        }
        
        return {
            id: user._id,
            email: user.email,
            username: user.username,
            role: user.role
        };
    },

    getUserById: async (id) => {
        return await User.findById(id);
    },

    // פונקציה ספציפית לפרופיל - מחזירה מידע מסונן
    getUserProfile: async (id) => {
        const user = await User.findById(id).select('-password -__v');
        if (!user) {
            throw new Error('User not found');
        }
        
        return {
            id: user._id,
            email: user.email,
            username: user.username,
            role: user.role,
            phone: user.phone,
            age: user.age,
            gender: user.gender,
            createdAt: user.createdAt        };
    },

    // פונקציה כללית לעדכון משתמש (למנהלים)
    updateUser: async (id, userData) => {
        const updatedUser = await User.findByIdAndUpdate(id, userData, { new: true }).select('-password -__v');
        return updatedUser;
    },

    // פונקציה ספציפית לעדכון פרופיל אישי (למשתמש עצמו)
    updateOwnProfile: async (id, profileData) => {
        // רק שדות מותרים לעדכון עצמי
        const allowedFields = ['username', 'phone', 'age'];
        const filteredData = {};
        
        for (const field of allowedFields) {
            if (profileData[field] !== undefined) {
                filteredData[field] = profileData[field];
            }
        }
        
        const updatedUser = await User.findByIdAndUpdate(id, filteredData, { new: true }).select('-password -__v');
        return updatedUser;
    },

    getAllUsers: async () => {
        return await User.find({}).select('-password'); // ללא סיסמה
    },

    deleteUser: async (id) => {
        return await User.findByIdAndDelete(id);
    },

    // פונקציה זמנית ליצירת admin ראשוני (רק לפיתוח!)
    createFirstAdmin: async (userData) => {
        // בדיקה שאין כבר admin
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            throw new Error("Admin already exists");
        }
        
        userData.role = 'admin';
        return await createUser(userData);
    },
};

export default UserService;
