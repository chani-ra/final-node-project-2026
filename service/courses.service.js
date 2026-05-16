// service/course.service.js
import Course from '../models/course.model.js';
import User from '../models/users.model.js';

const hobbyCategoryMap = {
  'אומנות ומוזיקה': ['conversation-skills', 'listening-comprehension'],
  'פעילויות': ['vocabulary-everyday', 'conversation-skills'],
  'צפיה בסרטים': ['listening-comprehension', 'vocabulary-everyday'],
  'קריאת ספרים': ['reading-comprehension', 'academic-english'],
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

  if (user.parentOrChild === 'ילד' && course.category === 'english-for-kids') {
    score += 20;
  }

  if (user.parentOrChild === 'הורה' && ['conversation-skills', 'vocabulary-everyday'].includes(course.category)) {
    score += 10;
  }

  if (user.gender === 'female' && ['conversation-skills', 'listening-comprehension', 'reading-comprehension'].includes(course.category)) {
    score += 5;
  }

  if (user.gender === 'male' && ['business-english', 'grammar-basics', 'vocabulary-everyday'].includes(course.category)) {
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
  // ✅ קבלת קורסים מומלצים
  getRecommendedCourses: async (user) => {
    try {
      const query = buildRecommendationQuery(user);
      const enrolledCourseIds = user.enrolledCourses?.map((id) => String(id)) || [];

      const courses = await Course.find(query)
        .populate('instructorId', 'username email')
        .populate('lessons')
        .populate('songs')
        .populate('exercises')
        .populate('quizzes')
        .sort({ createdAt: -1 });

      const recommended = courses
        .filter((course) => !enrolledCourseIds.includes(String(course._id)))
        .map((course) => ({ course, score: getCourseScore(course, user, enrolledCourseIds) }))
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.course);

      return recommended.slice(0, 10);
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
      const user = await User.findById(studentId);

      if (!course) {
        throw new Error('קורס לא נמצא');
      }

      if (!user) {
        throw new Error('משתמש לא נמצא');
      }

      if (course.enrolledStudents.includes(studentId)) {
        throw new Error('אתה כבר רשום לקורס זה');
      }

      if (user.enrolledCourses.includes(courseId)) {
        throw new Error('הקורס כבר קיים ברשימת הקורסים שלך');
      }

      course.enrolledStudents.push(studentId);
      user.enrolledCourses.push(courseId);

      await Promise.all([course.save(), user.save()]);

      return { message: 'נרשמת לקורס בהצלחה', course };
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