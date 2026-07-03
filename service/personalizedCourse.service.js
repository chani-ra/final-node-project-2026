import Course from "../models/course.model.js";
import Lesson from "../models/lessons.model.js";
import Song from "../models/songs.model.js";
import Exercise from "../models/exercise.model.js";
import Quiz from "../models/quiz.model.js";
import User from "../models/users.model.js";

const categoryByExpectation = {
  grammar: "grammar",
  vocabulary: "vocabulary",
  fluent_speaking: "conversation",
  confidence: "conversation",
};

const levelAliases = {
  beginner: ["beginner", "מתחילים", "בסיס"],
  intermediate: ["intermediate", "בינוני", "ביניים"],
  advanced: ["advanced", "מתקדמים"],
};

const normalizeLevel = (level) => {
  const map = {
    beginner: "beginner",
    intermediate: "intermediate",
    advanced: "advanced",
    מתחילים: "beginner",
    בסיס: "beginner",
    בינוני: "intermediate",
    ביניים: "intermediate",
    מתקדמים: "advanced",
  };

  return map[level] || "beginner";
};

const getLevelAliases = (level) => {
  const normalizedLevel = normalizeLevel(level);
  return levelAliases[normalizedLevel] || ["beginner", "מתחילים", "בסיס"];
};

const getMainCategoryFromUser = (user) => {
  const firstExpectation = user.expectations?.[0];

  if (!firstExpectation) return "general";

  return categoryByExpectation[firstExpectation] || "general";
};

const ageMatches = (item, userAge) => {
  if (!item.targetAges) return true;

  const min = item.targetAges.min ?? 4;
  const max = item.targetAges.max ?? 120;

  return userAge >= min && userAge <= max;
};

const countMatches = (sourceList = [], targetList = []) => {
  if (!Array.isArray(sourceList) || !Array.isArray(targetList)) return 0;

  return sourceList.filter((item) => targetList.includes(item)).length;
};

const scoreItemForUser = (item, user) => {
  let score = 0;

  const itemLevel = normalizeLevel(item.level || item.englishLevel);
  const userLevel = normalizeLevel(user.englishLevel);

  // חשוב: אם הרמה לא תואמת — לא מכניסים בכלל.
  if (itemLevel !== userLevel) {
    return 0;
  }

  score += 50;

  if (ageMatches(item, user.age)) score += 20;

  const hobbyMatches = countMatches(item.hobbies, user.favoriteHobbies);
  score += hobbyMatches * 15;

  const expectationMatches = countMatches(item.expectations, user.expectations);
  score += expectationMatches * 20;

  const mainCategory = getMainCategoryFromUser(user);
  if (item.category === mainCategory) score += 15;

  if (item.isPublic) score += 5;

  return score;
};

const sortByBestMatch = (items, user) => {
  return items
    .map((item) => ({
      item,
      score: scoreItemForUser(item, user),
    }))
    .sort((a, b) => b.score - a.score)
    .filter((entry) => entry.score > 0)
    .map((entry) => entry.item);
};

const buildLevelQuery = (user, fieldName = "level") => {
  const aliases = getLevelAliases(user.englishLevel);

  return {
    isPublic: true,
    [fieldName]: { $in: aliases },
  };
};

const buildQuizQuery = (user) => {
  const aliases = getLevelAliases(user.englishLevel);

  return {
    isPublic: true,
    isActive: true,
    englishLevel: { $in: aliases },
  };
};

const createReason = (selected, isRefresh = false) => {
  const total =
    selected.lessons.length +
    selected.songs.length +
    selected.exercises.length +
    selected.quizzes.length;

  if (total > 0) {
    return isRefresh
      ? `המסלול רוענן ונמצאו ${total} פריטי תוכן שמתאימים לרמת הקורס, לתחביבים ולמטרות הלמידה.`
      : "הקורס הורכב מתוך תכנים קיימים במערכת שנמצאו מתאימים לרמה, גיל, תחביבים ומטרות הלמידה של התלמיד.";
  }

  return "עדיין לא נמצאו במערכת שיעורים/שירים/תרגילים/בחנים שמתאימים מספיק לרמה שבחרת. כאשר מורים יעלו תכנים מתאימים, ניתן יהיה לרענן את המסלול.";
};

const addUniqueItems = (currentIds = [], newItems = []) => {
  const currentStrings = currentIds.map((id) => id.toString());

  const newIds = newItems
    .map((item) => item._id)
    .filter((id) => !currentStrings.includes(id.toString()));

  return [...currentIds, ...newIds];
};

const createCourseTitle = (user, preferences = {}) => {
  const levelLabels = {
    beginner: "מתחילים",
    intermediate: "בינוני",
    advanced: "מתקדמים",
  };

  const normalizedLevel = normalizeLevel(
    preferences.englishLevel || user.englishLevel
  );

  const level = levelLabels[normalizedLevel] || "מותאם";

  return `מסלול אישי נוסף - ${level}`;
};

const mergeUserWithPreferences = (user, preferences = {}) => {
  const userObject = user.toObject?.() || user;

  return {
    ...userObject,
    _id: user._id,
    username: user.username,
    age: user.age,
    englishLevel: normalizeLevel(
      preferences.englishLevel || user.englishLevel || "beginner"
    ),
    favoriteHobbies:
      preferences.favoriteHobbies && preferences.favoriteHobbies.length > 0
        ? preferences.favoriteHobbies
        : user.favoriteHobbies || [],
    expectations:
      preferences.expectations && preferences.expectations.length > 0
        ? preferences.expectations
        : user.expectations || [],
  };
};

const PersonalizedCourseService = {
  findMatchingContent: async (user) => {
    const userForQuery = {
      ...user,
      englishLevel: normalizeLevel(user.englishLevel),
    };

    const [lessons, songs, exercises, quizzes] = await Promise.all([
      Lesson.find(buildLevelQuery(userForQuery, "level")).limit(80),
      Song.find(buildLevelQuery(userForQuery, "level")).limit(80),
      Exercise.find(buildLevelQuery(userForQuery, "level")).limit(80),
      Quiz.find(buildQuizQuery(userForQuery)).limit(80),
    ]);

    return {
      lessons: sortByBestMatch(lessons, userForQuery).slice(0, 5),
      songs: sortByBestMatch(songs, userForQuery).slice(0, 3),
      exercises: sortByBestMatch(exercises, userForQuery).slice(0, 5),
      quizzes: sortByBestMatch(quizzes, userForQuery).slice(0, 2),
    };
  },

  createPersonalizedCourseForUser: async (user, preferences = {}) => {
    const userForMatching = mergeUserWithPreferences(user, preferences);

    const selected = await PersonalizedCourseService.findMatchingContent(
      userForMatching
    );

    const mainCategory = getMainCategoryFromUser(userForMatching);
    const aiReason = createReason(selected, false);

    const courseLevel = normalizeLevel(userForMatching.englishLevel);

    const course = new Course({
      title:
        preferences.customTitle?.trim() ||
        (preferences.isAdditionalCourse
          ? createCourseTitle(user, {
              ...preferences,
              englishLevel: courseLevel,
            })
          : `המסלול האישי של ${user.username}`),

      description:
        "קורס אישי שנבנה לפי הרמה, הגיל, ההעדפות והמטרות שבחרת.",
      instructorId: user._id,
      createdFor: user._id,
      createdByAI: true,
      aiReason,
      category: mainCategory,

      // השדה המרכזי אצלך בקורסים
      level: courseLevel,

      lessons: selected.lessons.map((lesson) => lesson._id),
      songs: selected.songs.map((song) => song._id),
      exercises: selected.exercises.map((exercise) => exercise._id),
      quizzes: selected.quizzes.map((quiz) => quiz._id),

      enrolledStudents: [user._id],
      isPublic: false,
    });

    await course.save();

    user.enrolledCourses.addToSet(course._id);

    user.courseProgress.push({
      course: course._id,
      progress: 0,
      completedLessons: [],
      completedExercises: [],
      completedSongs: [],
      completedQuizzes: [],
      startedAt: new Date(),
      lastAccessedAt: new Date(),
    });

    await user.save();

    return {
      course,
      selected,
      aiReason,
    };
  },

  createAdditionalPersonalizedCourse: async (userId, preferences) => {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("משתמש לא נמצא");
    }

    return await PersonalizedCourseService.createPersonalizedCourseForUser(
      user,
      {
        ...preferences,
        englishLevel: normalizeLevel(preferences.englishLevel),
        isAdditionalCourse: true,
      }
    );
  },

  refreshPersonalizedCourse: async (courseId, userId) => {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("משתמש לא נמצא");
    }

    const course = await Course.findById(courseId);

    if (!course) {
      throw new Error("קורס לא נמצא");
    }

    const isOwner =
      course.createdFor?.toString() === userId.toString() ||
      course.enrolledStudents.some(
        (studentId) => studentId.toString() === userId.toString()
      );

    if (!isOwner) {
      throw new Error("אין לך הרשאה לרענן את הקורס הזה");
    }

    // חשוב:
    // רענון קורס צריך להשתמש ברמת הקורס, לא ברמת המשתמש הנוכחית.
    // אחרת תלמידה שהתקדמה לרמה גבוהה יותר עלולה להכניס תכנים מתקדמים לקורס מתחילים.
    const userForMatching = mergeUserWithPreferences(user, {
      englishLevel: course.level || user.englishLevel || "beginner",
      favoriteHobbies: user.favoriteHobbies || [],
      expectations: user.expectations || [],
    });

    const selected = await PersonalizedCourseService.findMatchingContent(
      userForMatching
    );

    course.lessons = addUniqueItems(course.lessons, selected.lessons);
    course.songs = addUniqueItems(course.songs, selected.songs);
    course.exercises = addUniqueItems(course.exercises, selected.exercises);
    course.quizzes = addUniqueItems(course.quizzes, selected.quizzes);

    course.aiReason = createReason(selected, true);

    await course.save();

    const populatedCourse = await Course.findById(course._id)
      .populate("lessons")
      .populate("songs")
      .populate("exercises")
      .populate("quizzes")
      .populate("instructorId", "username email");

    return {
      course: populatedCourse,
      selected,
      aiReason: course.aiReason,
    };
  },
};

export default PersonalizedCourseService;