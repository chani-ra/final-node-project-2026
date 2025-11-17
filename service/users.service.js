import User from '../models/users.model.js';
import bcrypt from 'bcryptjs';


const createUser = async (userData) => {
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) throw new Error("User already exists");
    // return { error: "User already exists" };


    const hashedPassword = await bcrypt.hash(userData.password, 10);
    userData.password = hashedPassword;
    // בדיקת role
    if (userData.role === 'admin') {
        // לוגיקה מיוחדת למנהל
    }

    const user = new User(userData);
    return await user.save();
}

const generateToken = (user) => {
    const payload = {
        userId: user._id,
        role: user.role,
    };
    const secretKey = process.env.JWT_SECRET || 'SecretKey';
    return jwt.sign(payload, secretKey, { expiresIn: '1h' });
};


const UserService = {

    register: async (userData) => {
        // ברישום עצמי תמיד נותנים role 'user'
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
        if (!user || user.password !== password) {
            // להשוות עם הביקאריפט קומפר...
            throw new Error("Invalid credentials");
        }
        const token = user.password;
        
        return user;
    },

    getUserById: async (id) => {
        return await User.findById(id);
    },

    updateUser: async (id, userData) => {
        return await User.findByIdAndUpdate(id, userData, { new: true });
    }
};

export default UserService;
