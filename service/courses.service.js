// service/course.service.js
import Course from '../models/course.model.js';

export const CourseService = {
  // ✅ קבלת קורסים מומלצים
  getRecommendedCourses: async (user) => {
    try {
      // קבל את כל הקורסים הפומביים
      const courses = await Course.find({ isPublic: true })
        .populate('instructorId', 'username email')
        .populate('lessons')
        .populate('songs')
        .sort({ createdAt: -1 })
        .limit(10);

      return courses;
    } catch (error) {
      throw error;
    }
  },

  // ✅ יצירת קורס
  createCourse: async (courseData, instructorId) => {
    try {
      if (!courseData.title || !courseData.category) {
        throw new Error('שם קורס וקטגוריה חובה');
      }

      const newCourse = new Course({
        ...courseData,
        instructorId,
      });

      await newCourse.save();
      await newCourse.populate('instructorId', 'username email');

      return newCourse;
    } catch (error) {
      throw error;
    }
  },

  // ✅ קבלת קורס
  getCourseById: async (courseId) => {
    try {
      const course = await Course.findByIdAndUpdate(
        courseId,
        { $inc: { totalViews: 1 } },
        { new: true }
      )
        .populate('instructorId', 'username email')
        .populate('lessons')
        .populate('songs')
        .populate('exercises')
        .populate('quizzes')
        .populate('enrolledStudents', 'username email');

      if (!course) {
        throw new Error('קורס לא נמצא');
      }

      return course;
    } catch (error) {
      throw error;
    }
  },

  // ✅ קורסים של מורה
  getInstructorCourses: async (instructorId, page = 1, limit = 10) => {
    try {
      const skip = (page - 1) * limit;

      const courses = await Course.find({ instructorId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('instructorId', 'username email')
        .populate('lessons')
        .populate('songs');

      const total = await Course.countDocuments({ instructorId });

      return {
        courses,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error) {
      throw error;
    }
  },

  // ✅ עדכון קורס
  updateCourse: async (courseId, courseData, userId) => {
    try {
      const course = await Course.findById(courseId);

      if (!course) {
        throw new Error('קורס לא נמצא');
      }

      if (course.instructorId.toString() !== userId) {
        throw new Error('אתה לא מורשה לערוך קורס זה');
      }

      const updatedCourse = await Course.findByIdAndUpdate(
        courseId,
        { ...courseData, updatedAt: Date.now() },
        { new: true }
      );

      return updatedCourse;
    } catch (error) {
      throw error;
    }
  },

  // ✅ מחיקת קורס
  deleteCourse: async (courseId, userId) => {
    try {
      const course = await Course.findById(courseId);

      if (!course) {
        throw new Error('קורס לא נמצא');
      }

      if (course.instructorId.toString() !== userId) {
        throw new Error('אתה לא מורשה למחוק קורס זה');
      }

      await Course.findByIdAndDelete(courseId);

      return { message: 'קורס נמחק בהצלחה' };
    } catch (error) {
      throw error;
    }
  },

  // ✅ הרשמה לקורס
  enrollStudentInCourse: async (courseId, studentId) => {
    try {
      const course = await Course.findById(courseId);

      if (!course) {
        throw new Error('קורס לא נמצא');
      }

      if (course.enrolledStudents.includes(studentId)) {
        throw new Error('אתה כבר רשום לקורס זה');
      }

      course.enrolledStudents.push(studentId);
      await course.save();

      return { message: 'נרשמת לקורס בהצלחה', course };
    } catch (error) {
      throw error;
    }
  },

  // ✅ הוספת שיעור
  addLessonToCourse: async (courseId, lessonId, userId) => {
    try {
      const course = await Course.findById(courseId);

      if (!course) throw new Error('קורס לא נמצא');
      if (course.instructorId.toString() !== userId) {
        throw new Error('אתה לא מורשה לעדכן קורס זה');
      }
      if (course.lessons.includes(lessonId)) {
        throw new Error('שיעור זה כבר בקורס');
      }

      course.lessons.push(lessonId);
      await course.save();

      return { message: 'שיעור התווסף בהצלחה', course };
    } catch (error) {
      throw error;
    }
  },

  // ✅ הוספת שיר
  addSongToCourse: async (courseId, songId, userId) => {
    try {
      const course = await Course.findById(courseId);

      if (!course) throw new Error('קורס לא נמצא');
      if (course.instructorId.toString() !== userId) {
        throw new Error('אתה לא מורשה לעדכן קורס זה');
      }
      if (course.songs.includes(songId)) {
        throw new Error('שיר זה כבר בקורס');
      }

      course.songs.push(songId);
      await course.save();

      return { message: 'שיר התווסף בהצלחה', course };
    } catch (error) {
      throw error;
    }
  },

  // ✅ הוספת תרגיל (בהמשך תוסיף לוגיקה מלאה)
  addExerciseToCourse: async (courseId, exerciseId, userId) => {
    try {
      const course = await Course.findById(courseId);

      if (!course) throw new Error('קורס לא נמצא');
      if (course.instructorId.toString() !== userId) {
        throw new Error('אתה לא מורשה לעדכן קורס זה');
      }
      if (course.exercises.includes(exerciseId)) {
        throw new Error('תרגיל זה כבר בקורס');
      }

      course.exercises.push(exerciseId);
      await course.save();

      return { message: 'תרגיל התווסף בהצלחה', course };
    } catch (error) {
      throw error;
    }
  },

  // ✅ הוספת בחן (בהמשך תוסיף לוגיקה מלאה)
  addQuizToCourse: async (courseId, quizId, userId) => {
    try {
      const course = await Course.findById(courseId);

      if (!course) throw new Error('קורס לא נמצא');
      if (course.instructorId.toString() !== userId) {
        throw new Error('אתה לא מורשה לעדכן קורס זה');
      }
      if (course.quizzes.includes(quizId)) {
        throw new Error('בחן זה כבר בקורס');
      }

      course.quizzes.push(quizId);
      await course.save();

      return { message: 'בחן התווסף בהצלחה', course };
    } catch (error) {
      throw error;
    }
  },

  // ✅ חיפוש קורסים
  searchCourses: async (query, page = 1, limit = 10) => {
    try {
      const skip = (page - 1) * limit;

      const filter = { isPublic: true };

      if (query.search) {
        filter.$or = [
          { title: { $regex: query.search, $options: 'i' } },
          { description: { $regex: query.search, $options: 'i' } },
          { category: { $regex: query.search, $options: 'i' } },
        ];
      }

      if (query.category) filter.category = query.category;
      if (query.level) filter.level = query.level;

      const courses = await Course.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('instructorId', 'username email');

      const total = await Course.countDocuments(filter);

      return {
        courses,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error) {
      throw error;
    }
  },
};

export default CourseService;