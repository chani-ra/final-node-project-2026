import { userValidationSchema } from '../validation/user.validation.js';
import UserService from '../service/users.service.js';


export const UserController = {
   
register: async (req, res, ) => {
    const { error } = userValidationSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }
    try {
        const newUser = await UserService.register(req.body);
        res.status(201).json({ message: "User registered successfully", token: newUser.password });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
},

  addUserByAdmin: async (req, res) => {
        const { error } = userValidationSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        
        try {
            const token = req.token; \\לשלוף מהאדר בצןרה אחרת 
            \\צריך לעשות פונקציה מיוחדת שמטפלת בהרשאות - היא מקבלת סיסמא - טוקו- ולפי הסיסמא היא שולפצ את היוזר מהדאטאבייס ואז בודקת האם הרול שווה מנהל או כל הרשאה אחרת
            const newUser = await UserService.addUserByAdmin(req.body, currentUser);
            res.status(201).json({ message: "User added successfully", user: newUser });
        } catch (error) {
            res.status(400).json({ message: error.message });
        }    },

    login: async (req, res) => {
        try {
            const token = await UserService.login(req.body.email, req.body.password);
            res.status(200).json({ message: "Login successful", token: token });
        } catch (error) {
            res.status(401).json({ message: error.message });
        }
    },
    
    // getUserProfile: async (req, res) => {
    //     try {
    //         const user = await UserService.getUserById(req.params.id);
    //         if (!user) {
    //             return res.status(404).json({ message: "User not found" });
    //         }
    //         res.status(200).json(user);
    //     } catch (error) {
    //         res.status(400).json({ message: error.message });
    //     }
    // },
    
    // updateUserProfile: async (req, res) => {
    //     try {
    //         const updatedUser = await UserService.updateUser(req.params.id, req.body);
    //         res.status(200).json(updatedUser);
    //     } catch (error) {
    //         res.status(400).json({ message: error.message });
    //     }
    // }
};

export default UserController;
