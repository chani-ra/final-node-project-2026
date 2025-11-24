import { userValidationSchema } from '../validation/user.validation.js';
import UserService from '../service/users.service.js';
import TokenService from '../service/token.service.js';

export const AuthController = {
  // יצירת admin ראשוני (זמני לפיתוח)
    createFirstAdmin: async (req, res) => {
        try {
            const admin = await UserService.createFirstAdmin(req.body);
            res.status(201).json({
                success: true,
                message: 'First admin created successfully',
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                user: {
                    id: admin._id,
                    email: admin.email,
                    role: admin.role
                }
            });
        } catch (error) {
            res.status(400).json({ 
                success: false, 
                message: error.message 
            });
        }
    },

    register: async (req, res) => {
        // Joi validation - מקצועי ומלא
        const { error } = userValidationSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
          try {
            const newUser = await UserService.register(req.body);
            const tokens = TokenService.generateTokenPair(newUser._id, newUser.role);
            
            res.status(201).json({ 
                message: "User registered successfully", 
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                user: { 
                    id: newUser._id, 
                    email: newUser.email,
                    username: newUser.username,
                    role: newUser.role
                }
            });
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },    
    login: async (req, res) => {
        try {
            // UserService רק מאמת - לא יוצר טוקן
            const user = await UserService.login(req.body.email, req.body.password);
            const tokens = TokenService.generateTokenPair(user.id, user.role);
            
            res.status(200).json({ 
                message: "Login successful", 
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                user 
            });
        } catch (error) {
            res.status(401).json({ message: error.message });
        }
    },

    refreshToken: async (req, res) => {
        try {
            const { refreshToken } = req.body;
            
            if (!refreshToken) {
                return res.status(400).json({ message: "Refresh token is required" });
            }

            // Verify refresh token
            const decoded = TokenService.verifyToken(refreshToken, 'refresh');
            
            if (decoded.type !== 'refresh') {
                return res.status(401).json({ message: "Invalid token type" });
            }

            // Get user data to include role in new token
            const user = await UserService.getUserById(decoded.userId);
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            // Generate new token pair
            const newTokens = TokenService.generateTokenPair(user._id, user.role);

            res.status(200).json({
                message: "Token refreshed successfully",
                token: newTokens.accessToken,
                refreshToken: newTokens.refreshToken
            });
            
        } catch (error) {
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: "Invalid or expired refresh token" });
            }
            res.status(500).json({ message: error.message });
        }
    }
};

export default AuthController;