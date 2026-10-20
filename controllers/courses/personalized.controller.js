import PersonalizedCourseService from '../../service/personalizedCourse.service.js';

// Personalized handlers; keep status codes and response schemas unchanged.
export const personalizedCourseController = {
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

  createPersonalizedCourse: async (req, res) => {
    try {
      const {
        englishLevel,
        favoriteHobbies,
        expectations,
        customTitle,
      } = req.body;

      const allowedLevels = [
        "beginner",
        "intermediate",
        "advanced",
      ];

      const allowedHobbies = [
        "art_music",
        "sports",
        "movies",
        "books",
      ];

      const allowedExpectations = [
        "grammar",
        "fluent_speaking",
        "confidence",
        "vocabulary",
      ];

      if (englishLevel && !allowedLevels.includes(englishLevel)) {
        return res.status(400).json({
          success: false,
          message: "רמת אנגלית לא תקינה",
        });
      }

      const validHobbies = Array.isArray(favoriteHobbies)
        ? favoriteHobbies.filter((item) =>
          allowedHobbies.includes(item)
        )
        : [];

      const validExpectations = Array.isArray(expectations)
        ? expectations.filter((item) =>
          allowedExpectations.includes(item)
        )
        : [];

      const result =
        await PersonalizedCourseService.createAdditionalPersonalizedCourse(
          req.user.id,
          {
            englishLevel,
            favoriteHobbies: validHobbies,
            expectations: validExpectations,
            customTitle,
          }
        );

      res.status(201).json({
        success: true,
        message: "קורס אישי נוסף נוצר בהצלחה",
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
  }
};
