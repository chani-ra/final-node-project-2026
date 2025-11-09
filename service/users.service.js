import User from '../models/users.model.js';

const UserService = {
    register: async (userData) => {
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
