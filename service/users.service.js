import User from '../models/users.model.js';

const UserService = {
    register: async (userData) => {
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) throw new Error("User already exists");

        const hashedPassword = await bcrypt.hash(userData.password, 10);
        userData.password = hashedPassword;
        // בדיקת role
        if (userData.role === 'admin') {
            // לוגיקה מיוחדת למנהל
        }

        const user = new User(userData);
        return await user.save();
    },

    login: async (email, password) => {
        const user = await User.findOne({ email });
        if (!user || user.password !== password) {
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
