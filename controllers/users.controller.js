import { userValidationSchema } from '../validation/user.validation.js';
import UserService from '../service/users.service.js';

import User from '../models/users.model.js'; 

const UserController = {
    // register: async (req, res) => {
    //     // בדיקת תקינות עם Joi
    //     const { error } = userValidationSchema.validate(req.body);
    //     if (error) {
    //         return res.status(400).json({ message: error.details[0].message });
    //     }
    //     try {
    //         const newUser = await UserService.register(req.body);
    //         res.status(201).json({ message: "User registered successfully", user: newUser });
    //     } catch (error) {
    //         res.status(400).json({ message: error.message });
    //     }
    // },

 register: async (req, res) => {
        // בדיקת תקינות עם Joi
        const { error } = userValidationSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        // בדיקה אם המשתמש כבר קיים
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
            return res.status(409).json({ message: "User already exists" });
        }

        // הצפנת סיסמה
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        // יצירת אובייקט משתמש חדש
        const userData = { ...req.body, password: hashedPassword };

        // בדיקה אם המשתמש הוא מנהל
        if (userData.role === 'admin') {
            // אפשר להוסיף לוגיקה מיוחדת כאן, לדוג' לשלוח אימייל או להוסיף הרשאות
        }

        try {
            const newUser = await UserService.register(userData);
            res.status(201).json({ message: "User registered successfully", user: newUser });
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },



    
    
    login: async (req, res) => {
        try {
            const user = await UserService.login(req.body.email, req.body.password);
            res.status(200).json({ message: "Login successful", user });
        } catch (error) {
            res.status(401).json({ message: error.message });
        }
    },
    
    getUserProfile: async (req, res) => {
        try {
            const user = await UserService.getUserById(req.params.id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            res.status(200).json(user);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },
    
    updateUserProfile: async (req, res) => {
        try {
            const updatedUser = await UserService.updateUser(req.params.id, req.body);
            res.status(200).json(updatedUser);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
};

export default UserController;
