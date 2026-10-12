import User from "../models/users.model.js";
import Course from "../models/course.model.js";
import { EmailService } from "../service/emailService.js";

import {
  getUserProgressList,
  markLessonCompleted,
  markExerciseCompleted,
  markSongCompleted,
  recalculateProgress,
} from "../service/progress.service.js";

export const ProfileController = {
  // קבלת פרופיל אישי מלא
  getUserProfile: async (req, res, next) => {
    try {
      const userId = req.user.id;

      const [user, progressList] = await Promise.all([
        User.findById(userId)
          .populate("enrolledCourses", "title category level instructorId")
          .populate("quizResults.quiz", "title quizType englishLevel")
          .populate("quizResults.course", "title"),
      
        getUserProgressList(userId),
      ]);

      if (!user) {
        return res.status(404).json({ message: "משתמש לא נמצא" });
      }

      const quizResults = user.quizResults || [];
      const achievements = user.achievements || [];

      const stats = {
        totalCoursesEnrolled: user.enrolledCourses?.length || 0,
        totalQuizzesTaken: quizResults.length,
        totalQuizzesPassed: quizResults.filter((result) => result.passed).length,
        averageQuizScore:
          quizResults.length > 0
            ? Math.round(
                quizResults.reduce(
                  (sum, result) => sum + (result.percentage || 0),
                  0
                ) / quizResults.length
              )
            : 0,
        currentEnglishLevel: user.englishLevel,
        totalStudyTime: user.totalStudyTime || 0,
        currentStreak: user.streakDays || 0,
        totalAchievements: achievements.length,
      };

      // שומרים על מבנה התשובה שה-Frontend כבר מכיר,
      // אבל הנתונים מגיעים עכשיו מ-CourseProgress החדש.
      const courseProgress = progressList.map((progress) => ({
        course: progress.course
          ? {
              _id: progress.course._id,
              title: progress.course.title,
              category: progress.course.category,
              level: progress.course.level,
            }
          : null,

        progress: progress.progressPercent || 0,
        completedLessons: progress.completedLessons?.length || 0,
        completedExercises: progress.completedExercises?.length || 0,
        completedSongs: progress.completedSongs?.length || 0,
        completedQuizzes: progress.completedQuizzes?.length || 0,
        startedAt: progress.createdAt || null,
        lastAccessedAt: progress.lastActivityAt || null,
      }));

      const recentQuizResults = [...quizResults]
        .sort(
          (a, b) =>
            new Date(b.completedAt).getTime() -
            new Date(a.completedAt).getTime()
        )
        .slice(0, 5)
        .map((result) => ({
          quiz: result.quiz,
          course: result.course,
          score: result.percentage,
          passed: result.passed,
          completedAt: result.completedAt,
        }));

      return res.status(200).json({
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          age: user.age,
          englishLevel: user.englishLevel,
          favoriteHobbies: user.favoriteHobbies,
          role: user.role,
          emailNotifications: user.emailNotifications,
        },
        stats,
        courseProgress,
        recentQuizResults,
        achievements,
      });
    } catch (error) {
      next(error);
    }
  },

  // עדכון התקדמות בקורס
  updateCourseProgress: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { courseId, lessonId, exerciseId, songId } = req.body;

      if (!courseId) {
        return res.status(400).json({ message: "חסר מזהה קורס" });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "משתמש לא נמצא" });
      }

      const isEnrolled = user.enrolledCourses.some(
        (id) => id.toString() === courseId.toString()
      );

      if (!isEnrolled) {
        return res.status(403).json({ message: "אתה לא רשום לקורס זה" });
      }

      let courseProgress = null;

      if (lessonId) {
        courseProgress = await markLessonCompleted(
          userId,
          courseId,
          lessonId
        );
      }

      if (exerciseId) {
        courseProgress = await markExerciseCompleted(
          userId,
          courseId,
          exerciseId
        );
      }

      if (songId) {
        courseProgress = await markSongCompleted(userId, courseId, songId);
      }

      // אם לא התקבל פריט מסוים, רק מחשבים מחדש את האחוז.
      if (!courseProgress) {
        courseProgress = await recalculateProgress(userId, courseId);
      }

      user.totalStudyTime = (user.totalStudyTime || 0) + 1;

      updateStudyStreak(user);
      await checkAndAwardAchievements(user, courseProgress);

      await user.save();

      await sendProgressEmailIfNeeded({
        user,
        courseId,
        progressPercent: courseProgress.progressPercent,
      });

      return res.status(200).json({
        message: "התקדמות עודכנה בהצלחה",

        // משאירים progress כדי לא לשבור את ה-Frontend הקיים.
        progress: courseProgress.progressPercent,

        streakDays: user.streakDays,
        totalStudyTime: user.totalStudyTime,
      });
    } catch (error) {
      next(error);
    }
  },

  // עדכון הגדרות פרופיל
  updateProfileSettings: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { emailNotifications, favoriteHobbies } = req.body;

      const updateData = {};

      if (emailNotifications !== undefined) {
        updateData.emailNotifications = emailNotifications;
      }

      if (Array.isArray(favoriteHobbies)) {
        updateData.favoriteHobbies = favoriteHobbies;
      }

      const user = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
      });

      if (!user) {
        return res.status(404).json({ message: "משתמש לא נמצא" });
      }

      return res.status(200).json({
        message: "הגדרות עודכנו בהצלחה",
        user: {
          emailNotifications: user.emailNotifications,
          favoriteHobbies: user.favoriteHobbies,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

function updateStudyStreak(user) {
  const now = new Date();
  const today = now.toDateString();

  const lastStudyDay = user.lastStudyDate
    ? new Date(user.lastStudyDate).toDateString()
    : null;

  if (lastStudyDay === today) {
    return;
  }

  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1
  ).toDateString();

  if (lastStudyDay === yesterday) {
    user.streakDays = (user.streakDays || 0) + 1;
  } else {
    user.streakDays = 1;
  }

  user.lastStudyDate = now;
}

async function sendProgressEmailIfNeeded({
  user,
  courseId,
  progressPercent,
}) {
  if (
    !user.emailNotifications ||
    progressPercent < 25 ||
    progressPercent % 25 !== 0
  ) {
    return;
  }

  try {
    const course = await Course.findById(courseId).select("title").lean();

    if (!course) {
      return;
    }

    await EmailService.sendProgressNotification(
      user.email,
      user.username,
      course.title,
      progressPercent
    );
  } catch (error) {
    console.error("Error sending progress email:", error);
  }
}

async function checkAndAwardAchievements(user, courseProgress) {
  try {
    const achievements = [];
    const existingAchievements = user.achievements || [];

    if (
      courseProgress.progressPercent === 100 &&
      !existingAchievements.some(
        (achievement) => achievement.type === "first_course_completed"
      )
    ) {
      achievements.push({
        type: "first_course_completed",
        title: "First Course Completed!",
        description: "Congratulations on completing your first English course!",
        icon: "🎓",
      });
    }

    if (
      user.streakDays >= 7 &&
      !existingAchievements.some(
        (achievement) => achievement.type === "streak_7_days"
      )
    ) {
      achievements.push({
        type: "streak_7_days",
        title: "Week Warrior!",
        description: "You studied for 7 days in a row!",
        icon: "🔥",
      });
    }

    const passedQuizzes =
      user.quizResults?.filter((result) => result.passed).length || 0;

    if (
      passedQuizzes >= 10 &&
      !existingAchievements.some(
        (achievement) => achievement.type === "quiz_master"
      )
    ) {
      achievements.push({
        type: "quiz_master",
        title: "Quiz Master!",
        description: "You passed 10 quizzes successfully!",
        icon: "🧠",
      });
    }

    const levels = ["beginner", "intermediate", "advanced"];
    const currentLevelIndex = levels.indexOf(user.englishLevel);

    if (currentLevelIndex > 0) {
      const previousLevel = levels[currentLevelIndex - 1];
      const achievementType = `level_up_${user.englishLevel}`;

      if (
        !existingAchievements.some(
          (achievement) => achievement.type === achievementType
        )
      ) {
        achievements.push({
          type: achievementType,
          title: `Level Up to ${user.englishLevel}!`,
          description: `Congratulations! You've advanced from ${previousLevel} to ${user.englishLevel} level.`,
          icon: "⬆️",
        });
      }
    }

    if (achievements.length > 0) {
      user.achievements.push(...achievements);
    }
  } catch (error) {
    console.error("Error checking achievements:", error);
  }
}

export default ProfileController;