import CourseService from '../../service/courses.service.js';

// Content handlers; keep status codes and response schemas unchanged.
export const contentCourseController = {
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
  }
};
