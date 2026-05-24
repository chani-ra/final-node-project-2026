import CourseService from '../service/courses.service.js';
import UserService from '../service/users.service.js';

export const CourseController = {
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

  createCourse: async (req, res) => {
    try {
      console.log('📥 req.body:', req.body);
      console.log('👤 req.user:', req.user);
      
      const { title, description, category, level, isPublic } = req.body;

      if (!title || !category) {
        return res.status(400).json({
          success: false,
          message: 'שם קורס וקטגוריה הם שדות חובה'
        });
      }

      const newCourse = await CourseService.createCourse({
        title,
        description,
        category,
        level,
        isPublic: isPublic !== undefined ? isPublic : true
      }, req.user.id);

      res.status(201).json({
        success: true,
        message: 'הקורס נוצר בהצלחה',
        course: newCourse
      });
    } catch (error) {
      console.error('❌ Error in createCourse:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  getEnrolledCourses: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      const result = await CourseService.getEnrolledCourses(req.user.id, page, limit);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  enrollInCourse: async (req, res) => {
    try {
      const { courseId } = req.params;
      const result = await CourseService.enrollStudentInCourse(courseId, req.user.id);
      
      res.status(200).json({
        success: true,
        message: result.message,
        course: result.course
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  getCourseById: async (req, res) => {
    try {
      const { courseId } = req.params;
      const course = await CourseService.getCourseById(courseId);
      res.status(200).json({
        success: true,
        course
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  updateCourse: async (req, res) => {
    try {
      const { courseId } = req.params;
      const updatedCourse = await CourseService.updateCourse(courseId, req.body, req.user.id);
      res.status(200).json({
        success: true,
        message: 'הקורס עודכן בהצלחה',
        course: updatedCourse
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  deleteCourse: async (req, res) => {
    try {
      const { courseId } = req.params;
      const result = await CourseService.deleteCourse(courseId, req.user.id);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
};

export default CourseController;