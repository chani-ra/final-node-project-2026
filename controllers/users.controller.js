import { userValidationSchema } from '../validation/user.validation.js';
import UserService from '../service/users.service.js';


export const UserController = {

    
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
