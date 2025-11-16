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
const UserService = {

    register: async (userData) => {
        // ברישום עצמי תמיד נותנים role 'user'
        userData.role = 'user';
        return await createUser(userData);
    },
    
    addUserByAdmin: async (userData, currentUser) => {
        if (!currentUser || currentUser.role !== 'admin') {
            throw new Error("Access denied. Only admins can add users.");
        }
        return await createUser(userData);
    },    login: async (email, password) => {
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error("Invalid credentials");
        }
        
        // השוואת סיסמה מוצפנת
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error("Invalid credentials");
        }
        
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
