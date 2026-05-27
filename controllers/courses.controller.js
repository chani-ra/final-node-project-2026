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
      const {
        title,
        description,
        category,
        level,
        isPublic,
        createdFor,
        createdByAI,
        aiReason,
      } = req.body;

      if (!title || !category) {
        return res.status(400).json({
          success: false,
          message: 'שם קורס וקטגוריה הם שדות חובה',
        });
      }

      const newCourse = await CourseService.createCourse(
        {
          title,
          description,
          category,
          level,
          isPublic: isPublic !== undefined ? isPublic : true,
          createdFor: createdFor || null,
          createdByAI: createdByAI || false,
          aiReason: aiReason || '',
        },
        req.user.id
      );

      res.status(201).json({
        success: true,
        message: 'הקורס נוצר בהצלחה',
        course: newCourse,
      });
    } catch (error) {
      console.error('❌ Error in createCourse:', error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
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

  enrollInCourse: async (req, res) => {
    try {
      const { courseId } = req.params;

      const result = await CourseService.enrollStudentInCourse(
        courseId,
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: result.message,
        course: result.course,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  getCourseById: async (req, res) => {
    try {
      const { courseId } = req.params;

      const course = await CourseService.getCourseById(courseId);

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  },

  updateCourse: async (req, res) => {
    try {
      const { courseId } = req.params;

      const updatedCourse = await CourseService.updateCourse(
        courseId,
        req.body,
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: 'הקורס עודכן בהצלחה',
        course: updatedCourse,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  deleteCourse: async (req, res) => {
    try {
      const { courseId } = req.params;

      const result = await CourseService.deleteCourse(courseId, req.user.id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  addLessonToCourse: async (req, res) => {
    try {
      const { courseId } = req.params;
      const { lessonId } = req.body;

      if (!lessonId) {
        return res.status(400).json({
          success: false,
          message: 'lessonId הוא שדה חובה',
        });
      }

      const result = await CourseService.addLessonToCourse(
        courseId,
        lessonId,
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: result.message,
        course: result.course,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  addSongToCourse: async (req, res) => {
    try {
      const { courseId } = req.params;
      const { songId } = req.body;

      if (!songId) {
        return res.status(400).json({
          success: false,
          message: 'songId הוא שדה חובה',
        });
      }

      const result = await CourseService.addSongToCourse(
        courseId,
        songId,
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: result.message,
        course: result.course,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  addExerciseToCourse: async (req, res) => {
    try {
      const { courseId } = req.params;
      const { exerciseId } = req.body;

      if (!exerciseId) {
        return res.status(400).json({
          success: false,
          message: 'exerciseId הוא שדה חובה',
        });
      }

      const result = await CourseService.addExerciseToCourse(
        courseId,
        exerciseId,
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: result.message,
        course: result.course,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  addQuizToCourse: async (req, res) => {
    try {
      const { courseId } = req.params;
      const { quizId } = req.body;

      if (!quizId) {
        return res.status(400).json({
          success: false,
          message: 'quizId הוא שדה חובה',
        });
      }

      const result = await CourseService.addQuizToCourse(
        courseId,
        quizId,
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: result.message,
        course: result.course,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  refreshPersonalizedCourse: async (req, res) => {
  try {
    const { courseId } = req.params;

    const result = await PersonalizedCourseService.refreshPersonalizedCourse(
      courseId,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: "המסלול האישי רוענן בהצלחה",
      course: result.course,
      selected: {
        lessons: result.selected.lessons.length,
        songs: result.selected.songs.length,
        exercises: result.selected.exercises.length,
        quizzes: result.selected.quizzes.length,
      },
      aiReason: result.aiReason,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
},
};

export default CourseController;