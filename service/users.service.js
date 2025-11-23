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

    updateUser: async (id, userData) => {
        return await User.findByIdAndUpdate(id, userData, { new: true });
    },

    getAllUsers: async () => {
        return await User.find({}).select('-password'); // ללא סיסמה
    },

    deleteUser: async (id) => {
        return await User.findByIdAndDelete(id);
    }
};

export default UserService;
