import Course from '../models/course.model.js';
import User from '../models/user.model.js';

const hobbyCategoryMap = {
  'art_music': ['conversation', 'listening'],
  'sports': ['vocabulary', 'conversation'],
  'movies': ['listening', 'vocabulary'],
  'books': ['reading', 'grammar'],
};

const getPreferredLevels = (user) => {
  if (!user || typeof user.age !== 'number') {
    return ['beginner', 'intermediate', 'advanced'];
  }
  if (user.age <= 12) return ['beginner'];
  if (user.age <= 16) return ['beginner', 'intermediate'];
  return ['beginner', 'intermediate', 'advanced'];
};

const buildRecommendationQuery = (user) => {
  const categories = new Set();
  if (Array.isArray(user.favoriteHobbies)) {
    user.favoriteHobbies.forEach((hobby) => {
      if (hobbyCategoryMap[hobby]) {
        hobbyCategoryMap[hobby].forEach((category) => categories.add(category));
      }
    });
  }

  const query = { isPublic: true };
  if (categories.size) {
    query.category = { $in: Array.from(categories) };
  }

  const preferredLevels = getPreferredLevels(user);
  if (preferredLevels.length && preferredLevels.length < 3) {
    query.level = { $in: preferredLevels };
  }

  return query;
};

const getCourseScore = (course, user, enrolledCourseIds) => {
  let score = 0;

  if (Array.isArray(user.favoriteHobbies)) {
    const matches = Array.from(new Set(user.favoriteHobbies.flatMap((hobby) => hobbyCategoryMap[hobby] || [])));
    if (matches.includes(course.category)) score += 40;
  }

  if (user.age !== undefined) {
    const preferredLevels = getPreferredLevels(user);
    if (preferredLevels.includes(course.level)) score += 20;
  }

  if (user.parentOrChild === 'child' && course.category === 'general') {
    score += 20;
  }

  if (user.parentOrChild === 'parent' && ['conversation', 'vocabulary'].includes(course.category)) {
    score += 10;
  }

  if (user.gender === 'female' && ['conversation', 'listening', 'reading'].includes(course.category)) {
    score += 5;
  }

  if (user.gender === 'male' && ['grammar', 'vocabulary'].includes(course.category)) {
    score += 5;
  }

  if (!enrolledCourseIds.includes(String(course._id))) {
    score += 20;
  }

  if (course.lessons?.length) score += Math.min(course.lessons.length, 5) * 2;
  if (course.songs?.length) score += Math.min(course.songs.length, 3) * 2;
  if (course.quizzes?.length) score += Math.min(course.quizzes.length, 3) * 3;
  if (typeof course.rating === 'number' && course.rating > 0) score += course.rating * 3;

  return score;
};

export const CourseService = {
  // 🔥 אופטימיזציה: הפילטור נעשה ב-DB ולא בזיכרון של השרת
  getRecommendedCourses: async (user) => {
    try {
      const query = buildRecommendationQuery(user);
      const enrolledCourseIds = user.enrolledCourses?.map((id) => String(id)) || [];

      // מונע מראש הבאה של קורסים שהמשתמש כבר רשום אליהם
      if (enrolledCourseIds.length > 0) {
        query._id = { $nin: enrolledCourseIds };
      }

      const courses = await Course.find(query)
        .populate('instructorId', 'username email')
        .populate('lessons')
        .populate('songs')
        .populate('exercises')
        .populate('quizzes')
        .sort({ createdAt: -1 });

      const recommended = courses
        .map((course) => ({ course, score: getCourseScore(course, user, enrolledCourseIds) }))
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.course);

      return recommended.slice(0, 10);
    } catch (error) {
      throw error;
    }
  },

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

  // 🔥 אופטימיזציה: שימוש ב-$addToSet אטומי למניעת Race Conditions וכפילויות
  enrollStudentInCourse: async (courseId, studentId) => {
    try {
      // עדכון הקורס - הוספת הסטודנט רק אם הוא לא קיים שם
      const updatedCourse = await Course.findOneAndUpdate(
        { _id: courseId, enrolledStudents: { $ne: studentId } },
        { $addToSet: { enrolledStudents: studentId } },
        { new: true }
      );

      if (!updatedCourse) {
        // אם לא חזר קורס, או שהקורס לא קיים או שהסטודנט כבר רשום
        const courseExists = await Course.exists({ _id: courseId });
        if (!courseExists) throw new Error('קורס לא נמצא');
        throw new Error('אתה כבר רשום לקורס זה');
      }

      // עדכון המשתמש - הוספת הקורס
      const updatedUser = await User.findOneAndUpdate(
        { _id: studentId, enrolledCourses: { $ne: courseId } },
        { $addToSet: { enrolledCourses: courseId } }
      );

      if (!updatedUser) {
        throw new Error('משתמש לא נמצא או שכבר רשום לקורס');
      }

      return { message: 'נרשמת לקורס בהצלחה', course: updatedCourse };
    } catch (error) {
      throw error;
    }
  },

  getEnrolledCourses: async (userId, page = 1, limit = 10) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('משתמש לא נמצא');
      }

      const enrolledCourseIds = user.enrolledCourses || [];
      const skip = (page - 1) * limit;

      const courses = await Course.find({ _id: { $in: enrolledCourseIds } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('instructorId', 'username email')
        .populate('lessons')
        .populate('songs');

      const total = enrolledCourseIds.length;

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

  // 🔥 אופטימיזציה: פונקציות הוספת תוכן קצרות ובטוחות יותר באמצעות findOneAndUpdate
  addLessonToCourse: async (courseId, lessonId, userId) => {
    try {
      const course = await Course.findOneAndUpdate(
        { _id: courseId, instructorId: userId },
        { $addToSet: { lessons: lessonId } },
        { new: true }
      );

      if (!course) {
        const courseExists = await Course.exists({ _id: courseId });
        if (!courseExists) throw new Error('קורס לא נמצא');
        throw new Error('אתה לא מורשה לעדכן קורס זה או שהשיעור כבר קיים');
      }

      return { message: 'שיעור התווסף בהצלחה', course };
    } catch (error) {
      throw error;
    }
  },

  addSongToCourse: async (courseId, songId, userId) => {
    try {
      const course = await Course.findOneAndUpdate(
        { _id: courseId, instructorId: userId },
        { $addToSet: { songs: songId } },
        { new: true }
      );

      if (!course) {
        const courseExists = await Course.exists({ _id: courseId });
        if (!courseExists) throw new Error('קורס לא נמצא');
        throw new Error('אתה לא מורשה לעדכן קורס זה או שהשיר כבר קיים');
      }

      return { message: 'שיר התווסף בהצלחה', course };
    } catch (error) {
      throw error;
    }
  },

  addExerciseToCourse: async (courseId, exerciseId, userId) => {
    try {
      const course = await Course.findOneAndUpdate(
        { _id: courseId, instructorId: userId },
        { $addToSet: { exercises: exerciseId } },
        { new: true }
      );

      if (!course) {
        const courseExists = await Course.exists({ _id: courseId });
        if (!courseExists) throw new Error('קורס לא נמצא');
        throw new Error('אתה לא מורשה לעדכן קורס זה או שהתרגיל כבר קיים');
      }

      return { message: 'תרגיל התווסף בהצלחה', course };
    } catch (error) {
      throw error;
    }
  },

  addQuizToCourse: async (courseId, quizId, userId) => {
    try {
      const course = await Course.findOneAndUpdate(
        { _id: courseId, instructorId: userId },
        { $addToSet: { quizzes: quizId } },
        { new: true }
      );

      if (!course) {
        const courseExists = await Course.exists({ _id: courseId });
        if (!courseExists) throw new Error('קורס לא נמצא');
        throw new Error('אתה לא מורשה לעדכן קורס זה או שהבוחן כבר קיים');
      }

      return { message: 'בחן התווסף בהצלחה', course };
    } catch (error) {
      throw error;
    }
  },

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
        .populate('instructorId', 'username email')
        .populate('lessons')
        .populate('songs');

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