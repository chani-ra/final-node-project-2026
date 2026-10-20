import CourseService from '../../service/courses.service.js';
import UserService from '../../service/users.service.js';

// Catalog handlers; keep status codes and response schemas unchanged.
export const catalogCourseController = {
  getRecommendedCourses: async (req, res) => {
    try {
      const user = await UserService.getUserById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'משתמש לא נמצא',
        });
      }

      const recommendedCourses = await CourseService.getRecommendedCourses(user);

      res.status(200).json({
        success: true,
        count: recommendedCourses.length,
        courses: recommendedCourses,
      });
    } catch (error) {
      console.error('❌ Error:', error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  discoverCourses: async (req, res, next) => {
    try {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(
        Math.max(parseInt(req.query.limit) || 12, 1),
        50
      );

      const result = await CourseService.searchCourses(
        {
          search: req.query.search,
          category: req.query.category,
          level: req.query.level,
        },
        page,
        limit
      );

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  getEnrolledCourses: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await CourseService.getEnrolledCourses(
        req.user.id,
        page,
        limit
      );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  enrollInCourse: async (req, res, next) => {
    try {
      const { courseId } = req.params;

      const result = await CourseService.enrollStudentInCourse(
        courseId,
        req.user.id
      );

      return res.status(200).json({
        success: true,
        message: result.message,
        courseId: result.courseId,
        progressPercent: result.progressPercent,
      });
    } catch (error) {
      next(error);
    }
  },

  getCourseById: async (req, res, next) => {
    try {
      const course = await CourseService.getCourseById(
        req.params.courseId,
        req.user
      );

      return res.status(200).json({
        success: true,
        course,
      });
    } catch (error) {
      next(error);
    }
  }
};
