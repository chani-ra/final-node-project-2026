import { userValidationSchema } from '../validation/user.validation.js';
import UserService from '../service/users.service.js';
import TokenService from '../service/token.service.js';
import AIService from '../service/aiService.js';
import Course from '../models/course.model.js';

export const AuthController = {
  // יצירת admin ראשוני - זמני לפיתוח
  createFirstAdmin: async (req, res) => {
    try {
      const admin = await UserService.createFirstAdmin(req.body);
      const tokens = TokenService.generateTokenPair(admin._id, admin.role);

      res.status(201).json({
        success: true,
        message: 'First admin created successfully',
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: UserService.filterUserData(admin),
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  register: async (req, res) => {
    const { error } = userValidationSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    try {
      const newUser = await UserService.register(req.body);
      const tokens = TokenService.generateTokenPair(newUser._id, newUser.role);

      try {
        const aiResult = await AIService.generatePersonalizedCourse(newUser);

        const newCourse = new Course({
          title: aiResult.course.title,
          description: aiResult.course.description,
          category: aiResult.course.category,
          level: aiResult.course.level,
          instructorId: newUser._id,
          isPublic: false,
          enrolledStudents: [newUser._id],
        });

        await newCourse.save();

        newUser.enrolledCourses.push(newCourse._id);
        newUser.courseProgress.push({
          course: newCourse._id,
          progress: 0,
        });

        await newUser.save();
      } catch (aiError) {
        console.error('Failed to automatically create AI course:', aiError);
      }

      const safeUser = UserService.filterUserData(newUser);

      console.log('✅ Register user returned to client:', safeUser);

      res.status(201).json({
        success: true,
        message: 'User registered successfully and personalized course assigned',
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: safeUser,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  login: async (req, res) => {
    try {
      const user = await UserService.login(req.body.email, req.body.password);
      const tokens = TokenService.generateTokenPair(user.id, user.role);

      console.log('✅ Login user returned to client:', user);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user,
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message,
      });
    }
  },

  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required',
        });
      }

      const decoded = TokenService.verifyToken(refreshToken, 'refresh');

      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token type',
        });
      }

      const user = await UserService.getUserById(decoded.userId);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
        });
      }

      const newTokens = TokenService.generateTokenPair(user._id, user.role);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        token: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      });
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token',
        });
      }

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};

export default AuthController;