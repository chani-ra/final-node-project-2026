// controllers/course.controller.js
import CourseService from '../service/courses.service.js';
import UserService from '../service/users.service.js';

export const CourseController = {
  // ✅ קורסים מומלצים
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

  // ✅ יצירת קורס
  createCourse: async (req, res) => {
    try {
      const { title, description, category, level, isPublic } = req.body;

      if (!title || !category) {
        return res.status(400).json({
          success: false,
          message: 'שם קורס וקטגוריה חובה',
        });
      }

      const newCourse = await CourseService.createCourse(
        {
          title,
          description: description || '',
          category,
          level: level || 'beginner',
          isPublic: isPublic === true || isPublic === 'true',
        },
        req.user.id
      );

      res.status(201).json({
        success: true,
        message: 'קורס נוצר בהצלחה',
        course: newCourse,
      });
    } catch (error) {
      console.error('❌ Error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // ✅ קורס לפי ID
  getCourseById: async (req, res) => {
    try {
      const course = await CourseService.getCourseById(req.params.courseId);

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error) {
      console.error('❌ Error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // ✅ קורסים של מורה
  getInstructorCourses: async (req, res) => {
    try {
      const result = await CourseService.getInstructorCourses(
        req.params.instructorId,
        parseInt(req.query.page) || 1,
        parseInt(req.query.limit) || 10
      );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('❌ Error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // ✅ עדכון קורס
  updateCourse: async (req, res) => {
    try {
      const updatedCourse = await CourseService.updateCourse(
        req.params.courseId,
        req.body,
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: 'קורס עודכן בהצלחה',
        course: updatedCourse,
      });
    } catch (error) {
      console.error('❌ Error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // ✅ מחיקת קורס
  deleteCourse: async (req, res) => {
    try {
      await CourseService.deleteCourse(req.params.courseId, req.user.id);

      res.status(200).json({
        success: true,
        message: 'קורס נמחק בהצלחה',
      });
    } catch (error) {
      console.error('❌ Error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // ✅ הרשמה לקורס
  enrollStudent: async (req, res) => {
    try {
      const result = await CourseService.enrollStudentInCourse(
        req.params.courseId,
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error('❌ Error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // ✅ הוספת שיעור
  addLessonToCourse: async (req, res) => {
    try {
      const result = await CourseService.addLessonToCourse(
        req.params.courseId,
        req.body.lessonId,
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: result.message,
        course: result.course,
      });
    } catch (error) {
      console.error('❌ Error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // ✅ הוספת שיר
  addSongToCourse: async (req, res) => {
    try {
      const result = await CourseService.addSongToCourse(
        req.params.courseId,
        req.body.songId,
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: result.message,
        course: result.course,
      });
    } catch (error) {
      console.error('❌ Error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // ✅ הוספת תרגיל
  addExerciseToCourse: async (req, res) => {
    try {
      const result = await CourseService.addExerciseToCourse(
        req.params.courseId,
        req.body.exerciseId,
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: result.message,
        course: result.course,
      });
    } catch (error) {
      console.error('❌ Error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // ✅ הוספת בחן
  addQuizToCourse: async (req, res) => {
    try {
      const result = await CourseService.addQuizToCourse(
        req.params.courseId,
        req.body.quizId,
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: result.message,
        course: result.course,
      });
    } catch (error) {
      console.error('❌ Error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // ✅ חיפוש
  searchCourses: async (req, res) => {
    try {
      const result = await CourseService.searchCourses(
        {
          search: req.query.search,
          category: req.query.category,
          level: req.query.level,
        },
        parseInt(req.query.page) || 1,
        parseInt(req.query.limit) || 10
      );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('❌ Error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};

export default CourseController;