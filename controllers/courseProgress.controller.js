import {
  getCourseProgress,
  getCoursesProgressSummary,
  setCourseItemCompletion,
  recalculateProgress,
} from "../service/progress.service.js";

export const CourseProgressController = {
  getMyCourseProgress: async (
    req,
    res,
    next
  ) => {
    try {
      const progress =
        await getCourseProgress(
          req.user.id,
          req.params.courseId
        );

      return res.status(200).json({
        success: true,
        progress,
      });
    } catch (error) {
      next(error);
    }
  },

  getMyCoursesProgressSummary: async (
    req,
    res,
    next
  ) => {
    try {
      const summary =
        await getCoursesProgressSummary(
          req.user.id
        );

      return res.status(200).json({
        success: true,
        summary,
      });
    } catch (error) {
      next(error);
    }
  },

  toggleCourseItemProgress: async (
    req,
    res,
    next
  ) => {
    try {
      const {
        itemType,
        itemId,
        completed = true,
      } = req.body;

      const progress =
        await setCourseItemCompletion({
          userId: req.user.id,

          courseId:
            req.params.courseId,

          itemType,
          itemId,
          completed,
        });

      return res.status(200).json({
        success: true,

        message: completed
          ? "הפריט סומן כבוצע"
          : "הסימון הוסר",

        progress,
      });
    } catch (error) {
      next(error);
    }
  },

  recalculateCourseProgress: async (
    req,
    res,
    next
  ) => {
    try {
      const progress =
        await recalculateProgress(
          req.user.id,
          req.params.courseId
        );

      return res.status(200).json({
        success: true,
        progress,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default CourseProgressController;