import CourseProgress from "../models/courseProgress.model.js";

const VALID_ITEM_TYPES = ["lesson", "song", "exercise", "quiz"];

const FIELD_BY_TYPE = {
  lesson: "completedLessons",
  song: "completedSongs",
  exercise: "completedExercises",
  quiz: "completedQuizzes",
};

export const CourseProgressController = {
  // קבלת התקדמות של קורס אחד
  getMyCourseProgress: async (req, res) => {
    try {
      const userId = req.user.id;
      const { courseId } = req.params;

      const progress = await CourseProgress.findOne({
        user: userId,
        course: courseId,
      }).lean();

      return res.status(200).json({
        success: true,
        progress: progress || buildEmptyProgress(courseId),
      });
    } catch (error) {
      console.error("❌ getMyCourseProgress error:", error.message || error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // קבלת כל התקדמויות הקורסים שלי
  getMyCoursesProgressSummary: async (req, res) => {
    try {
      const userId = req.user.id;

      const progressList = await CourseProgress.find({
        user: userId,
      })
        .sort({ lastActivityAt: -1 })
        .lean();

      const totalCourses = progressList.length;

      const averageProgress =
        totalCourses > 0
          ? Math.round(
              progressList.reduce(
                (sum, item) => sum + (item.progressPercent || 0),
                0
              ) / totalCourses
            )
          : 0;

      const completedCourses = progressList.filter(
        (item) => item.progressPercent >= 100
      ).length;

      return res.status(200).json({
        success: true,
        summary: {
          totalCourses,
          completedCourses,
          averageProgress,
          progressList,
        },
      });
    } catch (error) {
      console.error(
        "❌ getMyCoursesProgressSummary error:",
        error.message || error
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // סימון פריט בקורס כבוצע / ביטול ביצוע
  toggleCourseItemProgress: async (req, res) => {
    try {
      const userId = req.user.id;
      const { courseId } = req.params;

      const {
        itemType,
        itemId,
        completed = true,
        totals = {},
      } = req.body;

      if (!VALID_ITEM_TYPES.includes(itemType)) {
        return res.status(400).json({
          success: false,
          message: "סוג פריט לא תקין",
        });
      }

      if (!itemId) {
        return res.status(400).json({
          success: false,
          message: "חסר itemId",
        });
      }

      const fieldName = FIELD_BY_TYPE[itemType];

      let progress = await CourseProgress.findOne({
        user: userId,
        course: courseId,
      });

      if (!progress) {
        progress = await CourseProgress.create({
          user: userId,
          course: courseId,
        });
      }

      const currentIds = progress[fieldName].map((id) => id.toString());
      const alreadyExists = currentIds.includes(itemId.toString());

      if (completed && !alreadyExists) {
        progress[fieldName].push(itemId);
      }

      if (!completed && alreadyExists) {
        progress[fieldName] = progress[fieldName].filter(
          (id) => id.toString() !== itemId.toString()
        );
      }

      progress.progressPercent = calculateProgressPercent({
        progress,
        totals,
      });

      progress.lastActivityAt = new Date();

      await progress.save();

      return res.status(200).json({
        success: true,
        message: completed ? "הפריט סומן כבוצע" : "הסימון הוסר",
        progress,
      });
    } catch (error) {
      console.error(
        "❌ toggleCourseItemProgress error:",
        error.message || error
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // חישוב מחדש של אחוז התקדמות לפי totals מהלקוח
  recalculateCourseProgress: async (req, res) => {
    try {
      const userId = req.user.id;
      const { courseId } = req.params;
      const { totals = {} } = req.body;

      let progress = await CourseProgress.findOne({
        user: userId,
        course: courseId,
      });

      if (!progress) {
        progress = await CourseProgress.create({
          user: userId,
          course: courseId,
        });
      }

      progress.progressPercent = calculateProgressPercent({
        progress,
        totals,
      });

      progress.lastActivityAt = new Date();

      await progress.save();

      return res.status(200).json({
        success: true,
        progress,
      });
    } catch (error) {
      console.error(
        "❌ recalculateCourseProgress error:",
        error.message || error
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};

function buildEmptyProgress(courseId) {
  return {
    course: courseId,
    completedLessons: [],
    completedSongs: [],
    completedExercises: [],
    completedQuizzes: [],
    progressPercent: 0,
  };
}

function calculateProgressPercent({ progress, totals }) {
  const totalLessons = Number(totals.lessons || 0);
  const totalSongs = Number(totals.songs || 0);
  const totalExercises = Number(totals.exercises || 0);
  const totalQuizzes = Number(totals.quizzes || 0);

  const totalItems = totalLessons + totalSongs + totalExercises + totalQuizzes;

  if (totalItems === 0) return 0;

  const completedItems =
    safeLength(progress.completedLessons) +
    safeLength(progress.completedSongs) +
    safeLength(progress.completedExercises) +
    safeLength(progress.completedQuizzes);

  return Math.max(
    0,
    Math.min(100, Math.round((completedItems / totalItems) * 100))
  );
}

function safeLength(value) {
  return Array.isArray(value) ? value.length : 0;
}

export default CourseProgressController;