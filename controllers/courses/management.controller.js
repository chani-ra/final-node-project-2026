import CourseService from '../../service/courses.service.js';

// Management handlers; keep status codes and response schemas unchanged.
export const managementCourseController = {
  createCourse: async (req, res) => {
    try {
      const {
        title,
        description,
        category,
        level,
        isPublic,
      } = req.body;

      if (!title?.trim() || !category) {
        return res.status(400).json({
          success: false,
          message: 'שם קורס וקטגוריה הם שדות חובה',
        });
      }

      const newCourse = await CourseService.createCourse(
        {
          title: title.trim(),
          description: description?.trim() || '',
          category,
          level: level || 'beginner',
          isPublic: isPublic !== undefined ? isPublic : true,
        },
        req.user.id
      );

      return res.status(201).json({
        success: true,
        message: 'הקורס נוצר בהצלחה',
        course: newCourse,
      });
    } catch (error) {
      console.error('❌ Error in createCourse:', error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  updateCourse: async (req, res, next) => {
    try {
      const updatedCourse = await CourseService.updateCourse(
        req.params.courseId,
        req.body,
        req.user
      );

      return res.status(200).json({
        success: true,
        message: 'הקורס עודכן בהצלחה',
        course: updatedCourse,
      });
    } catch (error) {
      next(error);
    }
  },

  deleteCourse: async (req, res, next) => {
    try {
      const result = await CourseService.deleteCourse(
        req.params.courseId,
        req.user
      );

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
};
