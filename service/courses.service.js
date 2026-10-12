import Course from '../models/course.model.js';
import User from '../models/users.model.js';
import { getOrCreateProgress } from './progress.service.js';

const hobbyCategoryMap = {
  art_music: ['conversation', 'listening'],
  sports: ['vocabulary', 'conversation'],
  movies: ['listening', 'vocabulary'],
  books: ['reading', 'grammar'],
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
        hobbyCategoryMap[hobby].forEach((category) =>
          categories.add(category)
        );
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
    const matches = Array.from(
      new Set(
        user.favoriteHobbies.flatMap(
          (hobby) => hobbyCategoryMap[hobby] || []
        )
      )
    );

    if (matches.includes(course.category)) {
      score += 40;
    }
  }

  if (user.age !== undefined) {
    const preferredLevels = getPreferredLevels(user);

    if (preferredLevels.includes(course.level)) {
      score += 20;
    }
  }

  if (
    user.parentOrChild === 'child' &&
    course.category === 'general'
  ) {
    score += 20;
  }

  if (
    user.parentOrChild === 'parent' &&
    ['conversation', 'vocabulary'].includes(course.category)
  ) {
    score += 10;
  }

  if (
    user.gender === 'female' &&
    ['conversation', 'listening', 'reading'].includes(course.category)
  ) {
    score += 5;
  }

  if (
    user.gender === 'male' &&
    ['grammar', 'vocabulary'].includes(course.category)
  ) {
    score += 5;
  }

  if (!enrolledCourseIds.includes(String(course._id))) {
    score += 20;
  }

  if (course.lessons?.length) {
    score += Math.min(course.lessons.length, 5) * 2;
  }

  if (course.songs?.length) {
    score += Math.min(course.songs.length, 3) * 2;
  }

  if (course.quizzes?.length) {
    score += Math.min(course.quizzes.length, 3) * 3;
  }

  if (
    typeof course.rating === 'number' &&
    course.rating > 0
  ) {
    score += course.rating * 3;
  }

  return score;
};

export const CourseService = {
  getRecommendedCourses: async (user) => {
    const query = buildRecommendationQuery(user);

    const enrolledCourseIds =
      user.enrolledCourses?.map((id) => String(id)) || [];

    if (enrolledCourseIds.length > 0) {
      query._id = { $nin: enrolledCourseIds };
    }

    const courses = await Course.find(query)
      .populate('instructorId', 'username email')
      .populate('lessons')
      .populate('songs')
      .populate('exercises')
      .populate({
        path: 'quizzes',
        select: '-questions.correctAnswer -questions.explanation',
      })
      .sort({ createdAt: -1 });

    return courses
      .map((course) => ({
        course,
        score: getCourseScore(
          course,
          user,
          enrolledCourseIds
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((entry) => entry.course);
  },

  createCourse: async (courseData, instructorId) => {
    if (!courseData.title || !courseData.category) {
      throw new Error('שם קורס וקטגוריה חובה');
    }

    const newCourse = new Course({
      ...courseData,
      instructorId,
    });

    await newCourse.save();

    await newCourse.populate(
      'instructorId',
      'username email'
    );

    return newCourse;
  },

  getCourseById: async (courseId, requestingUser) => {
    const course = await Course.findById(courseId).populate(
      'instructorId',
      'username'
    );

    if (!course) {
      const error = new Error('קורס לא נמצא');
      error.status = 404;
      throw error;
    }

    const userId = requestingUser.id.toString();
    const role = requestingUser.role;

    const instructorId =
      course.instructorId?._id?.toString() ||
      course.instructorId?.toString();

    const createdForId =
      course.createdFor?.toString();

    const isAdmin = role === 'admin';

    const isTeacherOwner =
      role === 'teacher' &&
      instructorId === userId;

    const isPersonalCourseOwner =
      createdForId === userId;

    const isEnrolled =
      (course.enrolledStudents || []).some(
        (studentId) =>
          studentId.toString() === userId
      );

    const hasFullAccess =
      isAdmin ||
      isTeacherOwner ||
      isPersonalCourseOwner ||
      isEnrolled;

    if (!course.isPublic && !hasFullAccess) {
      const error = new Error(
        'אין לך הרשאה לצפות בקורס זה'
      );
      error.status = 403;
      throw error;
    }

    await Course.updateOne(
      { _id: courseId },
      { $inc: { totalViews: 1 } }
    );

    course.totalViews =
      (course.totalViews || 0) + 1;

    if (course.isPublic && !hasFullAccess) {
      return {
        _id: course._id,
        title: course.title,
        description: course.description,
        category: course.category,
        level: course.level,
        rating: course.rating || 0,
        instructor: course.instructorId,
        totalViews: course.totalViews,
        access: 'preview',
        isEnrolled: false,

        contentSummary: {
          lessons:
            course.lessons?.length || 0,
          songs:
            course.songs?.length || 0,
          exercises:
            course.exercises?.length || 0,
          quizzes:
            course.quizzes?.length || 0,
        },
      };
    }

    const quizPopulate =
      isAdmin || isTeacherOwner
        ? {
          path: 'quizzes',
        }
        : {
          path: 'quizzes',
          select:
            '-questions.correctAnswer -questions.explanation',
        };

    await course.populate([
      {
        path: 'lessons',
      },
      {
        path: 'songs',
      },
      {
        path: 'exercises',
      },
      quizPopulate,
    ]);

    const safeCourse = course.toObject();

    delete safeCourse.enrolledStudents;

    safeCourse.access = 'full';

    safeCourse.isEnrolled =
      isEnrolled ||
      isPersonalCourseOwner;

    return safeCourse;
  },

  updateCourse: async (
    courseId,
    courseData,
    requestingUser
  ) => {
    const course =
      await Course.findById(courseId);

    if (!course) {
      const error =
        new Error('קורס לא נמצא');

      error.status = 404;
      throw error;
    }

    const isAdmin =
      requestingUser.role === 'admin';

    const isInstructor =
      course.instructorId.toString() ===
      requestingUser.id.toString();

    if (!isAdmin && !isInstructor) {
      const error =
        new Error(
          'אתה לא מורשה לערוך קורס זה'
        );

      error.status = 403;
      throw error;
    }

    return Course.findByIdAndUpdate(
      courseId,
      {
        ...courseData,
        updatedAt: Date.now(),
      },
      {
        new: true,
        runValidators: true,
      }
    );
  },

  deleteCourse: async (
    courseId,
    requestingUser
  ) => {
    const course =
      await Course.findById(courseId);

    if (!course) {
      const error =
        new Error('קורס לא נמצא');

      error.status = 404;
      throw error;
    }

    const isAdmin =
      requestingUser.role === 'admin';

    const isInstructor =
      course.instructorId.toString() ===
      requestingUser.id.toString();

    if (!isAdmin && !isInstructor) {
      const error =
        new Error(
          'אתה לא מורשה למחוק קורס זה'
        );

      error.status = 403;
      throw error;
    }

    await Course.findByIdAndDelete(courseId);

    return {
      message: 'קורס נמחק בהצלחה',
    };
  },

  enrollStudentInCourse: async (
    courseId,
    studentId
  ) => {
    const course =
      await Course.findById(courseId).select(
        'isPublic enrolledStudents'
      );

    if (!course) {
      const error =
        new Error('קורס לא נמצא');

      error.status = 404;
      throw error;
    }

    // הרשמה ידנית מותרת רק לקורסים ציבוריים של מורים.
    // קורס אישי נוצר ונרשם אוטומטית עבור המשתמש שלו.
    if (!course.isPublic) {
      const error =
        new Error(
          'לא ניתן להירשם לקורס פרטי'
        );

      error.status = 403;
      throw error;
    }

    const userExists =
      await User.exists({
        _id: studentId,
      });

    if (!userExists) {
      const error =
        new Error('משתמש לא נמצא');

      error.status = 404;
      throw error;
    }

    const alreadyEnrolled =
      course.enrolledStudents.some(
        (userId) =>
          userId.toString() ===
          studentId.toString()
      );

    if (alreadyEnrolled) {
      const error =
        new Error(
          'אתה כבר רשום לקורס זה'
        );

      error.status = 409;
      throw error;
    }

    await Promise.all([
      Course.findByIdAndUpdate(
        courseId,
        {
          $addToSet: {
            enrolledStudents:
              studentId,
          },
        }
      ),

      User.findByIdAndUpdate(
        studentId,
        {
          $addToSet: {
            enrolledCourses:
              courseId,
          },
        }
      ),
    ]);

    const progress =
      await getOrCreateProgress(
        studentId,
        courseId
      );

    return {
      message:
        'נרשמת לקורס בהצלחה',
      courseId,
      progressPercent:
        progress.progressPercent,
    };
  },

  getEnrolledCourses: async (
    userId,
    page = 1,
    limit = 10
  ) => {
    const user =
      await User.findById(userId);

    if (!user) {
      const error =
        new Error('משתמש לא נמצא');

      error.status = 404;
      throw error;
    }

    const enrolledCourseIds =
      user.enrolledCourses || [];

    const skip =
      (page - 1) * limit;

    const courses =
      await Course.find({
        _id: {
          $in: enrolledCourseIds,
        },
      })
        .sort({
          createdAt: -1,
        })
        .limit(limit)
        .skip(skip)
        .populate(
          'instructorId',
          'username email'
        )
        .populate('lessons')
        .populate('songs');

    return {
      courses,
      total:
        enrolledCourseIds.length,
      pages: Math.ceil(
        enrolledCourseIds.length /
        limit
      ),
      currentPage: page,
    };
  },

  addLessonToCourse: async (
    courseId,
    lessonId,
    userId
  ) => {
    const course =
      await Course.findOneAndUpdate(
        {
          _id: courseId,
          instructorId: userId,
        },
        {
          $addToSet: {
            lessons: lessonId,
          },
        },
        {
          new: true,
        }
      );

    if (!course) {
      const courseExists =
        await Course.exists({
          _id: courseId,
        });

      if (!courseExists) {
        const error =
          new Error(
            'קורס לא נמצא'
          );

        error.status = 404;
        throw error;
      }

      const error =
        new Error(
          'אתה לא מורשה לעדכן קורס זה או שהשיעור כבר קיים'
        );

      error.status = 403;
      throw error;
    }

    return {
      message:
        'שיעור התווסף בהצלחה',
      course,
    };
  },

  addSongToCourse: async (
    courseId,
    songId,
    userId
  ) => {
    const course =
      await Course.findOneAndUpdate(
        {
          _id: courseId,
          instructorId: userId,
        },
        {
          $addToSet: {
            songs: songId,
          },
        },
        {
          new: true,
        }
      );

    if (!course) {
      const courseExists =
        await Course.exists({
          _id: courseId,
        });

      if (!courseExists) {
        const error =
          new Error(
            'קורס לא נמצא'
          );

        error.status = 404;
        throw error;
      }

      const error =
        new Error(
          'אתה לא מורשה לעדכן קורס זה או שהשיר כבר קיים'
        );

      error.status = 403;
      throw error;
    }

    return {
      message:
        'שיר התווסף בהצלחה',
      course,
    };
  },

  addExerciseToCourse: async (
    courseId,
    exerciseId,
    userId
  ) => {
    const course =
      await Course.findOneAndUpdate(
        {
          _id: courseId,
          instructorId: userId,
        },
        {
          $addToSet: {
            exercises:
              exerciseId,
          },
        },
        {
          new: true,
        }
      );

    if (!course) {
      const courseExists =
        await Course.exists({
          _id: courseId,
        });

      if (!courseExists) {
        const error =
          new Error(
            'קורס לא נמצא'
          );

        error.status = 404;
        throw error;
      }

      const error =
        new Error(
          'אתה לא מורשה לעדכן קורס זה או שהתרגיל כבר קיים'
        );

      error.status = 403;
      throw error;
    }

    return {
      message:
        'תרגיל התווסף בהצלחה',
      course,
    };
  },

  addQuizToCourse: async (
    courseId,
    quizId,
    userId
  ) => {
    const course =
      await Course.findOneAndUpdate(
        {
          _id: courseId,
          instructorId: userId,
        },
        {
          $addToSet: {
            quizzes: quizId,
          },
        },
        {
          new: true,
        }
      );

    if (!course) {
      const courseExists =
        await Course.exists({
          _id: courseId,
        });

      if (!courseExists) {
        const error =
          new Error(
            'קורס לא נמצא'
          );

        error.status = 404;
        throw error;
      }

      const error =
        new Error(
          'אתה לא מורשה לעדכן קורס זה או שהבוחן כבר קיים'
        );

      error.status = 403;
      throw error;
    }

    return {
      message:
        'בחן התווסף בהצלחה',
      course,
    };
  },

  searchCourses: async (
    query,
    page = 1,
    limit = 10
  ) => {
    const skip = (page - 1) * limit;

    const filter = {
      isPublic: true,
    };

    if (query.search?.trim()) {
      const search = query.search.trim();

      filter.$or = [
        {
          title: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          description: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          category: {
            $regex: search,
            $options: 'i',
          },
        },
      ];
    }

    if (query.category) {
      filter.category = query.category;
    }

    if (query.level) {
      filter.level = query.level;
    }

    const courses = await Course.find(filter)
      .select(
        'title description category level rating instructorId lessons songs exercises quizzes createdAt'
      )
      .populate(
        'instructorId',
        'username'
      )
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .skip(skip)
      .lean();

    const total =
      await Course.countDocuments(filter);

    const coursePreviews = courses.map(
      (course) => ({
        _id: course._id,
        title: course.title,
        description: course.description,
        category: course.category,
        level: course.level,
        rating: course.rating || 0,
        instructor: course.instructorId,
        createdAt: course.createdAt,

        contentSummary: {
          lessons:
            course.lessons?.length || 0,
          songs:
            course.songs?.length || 0,
          exercises:
            course.exercises?.length || 0,
          quizzes:
            course.quizzes?.length || 0,
        },
      })
    );

    return {
      courses: coursePreviews,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    };
  },
};

export default CourseService;