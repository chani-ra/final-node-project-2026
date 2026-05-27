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

  const itemLevel = item.level === "מתחילים" ? "beginner" : item.level;

  if (itemLevel === user.englishLevel) score += 40;
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

const buildBaseQuery = (user) => {
  return {
    isPublic: true,
    $or: [
      { level: user.englishLevel },
      { level: "מתחילים" },
      { level: { $exists: false } },
    ],
  };
};

const buildQuizQuery = (user) => {
  return {
    isPublic: true,
    isActive: true,
    englishLevel: user.englishLevel,
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
      ? `המסלול רוענן ונמצאו ${total} פריטי תוכן שיכולים להתאים לרמה, לתחביבים ולמטרות הלמידה.`
      : "הקורס הורכב מתוך תכנים קיימים במערכת שנמצאו מתאימים לרמה, גיל, תחביבים ומטרות הלמידה של התלמיד.";
  }

  return "עדיין לא נמצאו במערכת שיעורים/שירים/תרגילים/בחנים מותאמים מספיק. כאשר מורים יעלו תכנים מתאימים, ניתן יהיה לרענן את המסלול.";
};

const addUniqueItems = (currentIds = [], newItems = []) => {
  const currentStrings = currentIds.map((id) => id.toString());

  const newIds = newItems
    .map((item) => item._id)
    .filter((id) => !currentStrings.includes(id.toString()));

  return [...currentIds, ...newIds];
};

const PersonalizedCourseService = {
  findMatchingContent: async (user) => {
    const baseQuery = buildBaseQuery(user);

    const [lessons, songs, exercises, quizzes] = await Promise.all([
      Lesson.find(baseQuery).limit(80),
      Song.find(baseQuery).limit(80),
      Exercise.find(baseQuery).limit(80),
      Quiz.find(buildQuizQuery(user)).limit(80),
    ]);

    return {
      lessons: sortByBestMatch(lessons, user).slice(0, 5),
      songs: sortByBestMatch(songs, user).slice(0, 3),
      exercises: sortByBestMatch(exercises, user).slice(0, 5),
      quizzes: sortByBestMatch(quizzes, user).slice(0, 2),
    };
  },

  createPersonalizedCourseForUser: async (user) => {
    const selected = await PersonalizedCourseService.findMatchingContent(user);

    const mainCategory = getMainCategoryFromUser(user);
    const aiReason = createReason(selected, false);

    const course = new Course({
      title: `המסלול האישי של ${user.username}`,
      description:
        "קורס אישי שנבנה לפי הרמה, הגיל, ההעדפות והמטרות שבחרת בהרשמה.",
      instructorId: user._id,
      createdFor: user._id,
      createdByAI: true,
      aiReason,
      category: mainCategory,
      level: user.englishLevel || "beginner",

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

    const selected = await PersonalizedCourseService.findMatchingContent(user);

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