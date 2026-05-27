import { userValidationSchema } from "../validation/user.validation.js";
import UserService from "../service/users.service.js";
import TokenService from "../service/token.service.js";
import PersonalizedCourseService from "../service/personalizedCourse.service.js";

export const AuthController = {
  createFirstAdmin: async (req, res) => {
    try {
      const admin = await UserService.createFirstAdmin(req.body);
      const tokens = TokenService.generateTokenPair(admin._id, admin.role);

      res.status(201).json({
        success: true,
        message: "First admin created successfully",
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

      let personalizedCourseResult = null;

      try {
        personalizedCourseResult =
          await PersonalizedCourseService.createPersonalizedCourseForUser(newUser);

        console.log("✅ Personalized course created:", {
          userId: newUser._id,
          courseId: personalizedCourseResult.course._id,
          lessons: personalizedCourseResult.selected.lessons.length,
          songs: personalizedCourseResult.selected.songs.length,
          exercises: personalizedCourseResult.selected.exercises.length,
          quizzes: personalizedCourseResult.selected.quizzes.length,
        });
      } catch (courseError) {
        console.error("Failed to create personalized course:", courseError);
      }

      const safeUser = UserService.filterUserData(newUser);

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: safeUser,
        personalizedCourse: personalizedCourseResult
          ? {
              id: personalizedCourseResult.course._id,
              title: personalizedCourseResult.course.title,
              aiReason: personalizedCourseResult.aiReason,
            }
          : null,
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

      res.status(200).json({
        success: true,
        message: "Login successful",
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
          message: "Refresh token is required",
        });
      }

      const decoded = TokenService.verifyToken(refreshToken, "refresh");

      if (decoded.type !== "refresh") {
        return res.status(401).json({
          success: false,
          message: "Invalid token type",
        });
      }

      const user = await UserService.getUserById(decoded.userId);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      const newTokens = TokenService.generateTokenPair(user._id, user.role);

      res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        token: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      });
    } catch (error) {
      if (
        error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError"
      ) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired refresh token",
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