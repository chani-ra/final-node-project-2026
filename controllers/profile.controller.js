import User from '../models/users.model.js';
import Course from '../models/course.model.js';
import { EmailService } from '../service/emailService.js';

export const ProfileController = {
  // 👤 קבלת פרופיל אישי מלא
  getUserProfile: async (req, res) => {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId)
        .populate('enrolledCourses', 'title category level instructorId')
        .populate('courseProgress.course', 'title category level')
        .populate('quizResults.quiz', 'title quizType englishLevel')
        .populate('quizResults.course', 'title')
        .populate('achievements');

      if (!user) {
        return res.status(404).json({ message: 'משתמש לא נמצא' });
      }

      const stats = {
        totalCoursesEnrolled: user.enrolledCourses.length,
        totalQuizzesTaken: user.quizResults.length,
        totalQuizzesPassed: user.quizResults.filter(r => r.passed).length,
        averageQuizScore: user.quizResults.length > 0
          ? Math.round(user.quizResults.reduce((sum, r) => sum + r.percentage, 0) / user.quizResults.length)
          : 0,
        currentEnglishLevel: user.englishLevel,
        totalStudyTime: user.totalStudyTime,
        currentStreak: user.streakDays,
        totalAchievements: user.achievements.length
      };

      const courseProgress = user.courseProgress.map(progress => {
        const course = progress.course;
        return {
          course: course ? {
            _id: course._id,
            title: course.title,
            category: course.category,
            level: course.level
          } : null, // הגנה מפני קורסים שנמחקו
          progress: progress.progress,
          completedLessons: progress.completedLessons.length,
          completedExercises: progress.completedExercises.length,
          completedSongs: progress.completedSongs.length,
          startedAt: progress.startedAt,
          lastAccessedAt: progress.lastAccessedAt
        };
      });

      const recentQuizResults = user.quizResults
        .sort((a, b) => b.completedAt - a.completedAt)
        .slice(0, 5)
        .map(result => ({
          quiz: result.quiz,
          course: result.course,
          score: result.percentage,
          passed: result.passed,
          completedAt: result.completedAt
        }));

      res.status(200).json({
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          age: user.age,
          englishLevel: user.englishLevel,
          favoriteHobbies: user.favoriteHobbies,
          role: user.role,
          emailNotifications: user.emailNotifications
        },
        stats,
        courseProgress,
        recentQuizResults,
        achievements: user.achievements
      });

    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: 'שגיאה בטעינת הפרופיל' });
    }
  },

  // 📊 עדכון התקדמות בקורס
  updateCourseProgress: async (req, res) => {
    try {
      const userId = req.user.id;
      const { courseId, lessonId, exerciseId, songId, progress } = req.body;

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'משתמש לא נמצא' });

      if (!user.enrolledCourses.includes(courseId)) {
        return res.status(403).json({ message: 'אתה לא רשום לקורס זה' });
      }

      let courseProgress = user.courseProgress.find(cp => cp.course.toString() === courseId);
      if (!courseProgress) {
        courseProgress = {
          course: courseId,
          completedLessons: [],
          completedExercises: [],
          completedSongs: [],
          progress: 0,
          startedAt: new Date(),
          lastAccessedAt: new Date()
        };
        user.courseProgress.push(courseProgress);
        // שמירה על הרפרנס הנכון ל-Mongoose - קריטי לשמירת נתונים תקינה
        courseProgress = user.courseProgress[user.courseProgress.length - 1]; 
      }

      if (lessonId && !courseProgress.completedLessons.includes(lessonId)) courseProgress.completedLessons.push(lessonId);
      if (exerciseId && !courseProgress.completedExercises.includes(exerciseId)) courseProgress.completedExercises.push(exerciseId);
      if (songId && !courseProgress.completedSongs.includes(songId)) courseProgress.completedSongs.push(songId);

      if (progress !== undefined) {
        courseProgress.progress = Math.min(100, Math.max(0, progress));
      } else {
        const course = await Course.findById(courseId);
        if (course) {
          // שימוש ב- Optional Chaining למניעת קריסות אם מערכים חסרים
          const totalItems = (course.lessons?.length || 0) + (course.exercises?.length || 0) + (course.songs?.length || 0);
          const completedItems = courseProgress.completedLessons.length + courseProgress.completedExercises.length + courseProgress.completedSongs.length;
          courseProgress.progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
        }
      }

      courseProgress.lastAccessedAt = new Date();
      user.totalStudyTime = (user.totalStudyTime || 0) + 1;

      const today = new Date().toDateString();
      const lastStudyDay = user.lastStudyDate ? new Date(user.lastStudyDate).toDateString() : null;

      if (lastStudyDay !== today) {
        if (lastStudyDay === new Date(Date.now() - 86400000).toDateString()) {
          user.streakDays = (user.streakDays || 0) + 1;
        } else {
          user.streakDays = 1;
        }
        user.lastStudyDate = new Date();
      }

      // בדיקת והענקת הישגים
      await checkAndAwardAchievements(user, courseProgress);

      await user.save();

      if (user.emailNotifications && courseProgress.progress >= 25 && courseProgress.progress % 25 === 0) {
        try {
          const course = await Course.findById(courseId);
          await EmailService.sendProgressNotification(user.email, user.username, course.title, courseProgress.progress);
        } catch (emailError) {
          console.error('Error sending progress email:', emailError);
        }
      }

      res.status(200).json({
        message: 'התקדמות עודכנה בהצלחה',
        progress: courseProgress.progress,
        streakDays: user.streakDays,
        totalStudyTime: user.totalStudyTime
      });

    } catch (error) {
      console.error('Error updating progress:', error);
      res.status(500).json({ message: 'שגיאה בעדכון ההתקדמות' });
    }
  },

  // ⚙️ עדכון הגדרות פרופיל
  updateProfileSettings: async (req, res) => {
    try {
      const userId = req.user.id;
      const { emailNotifications, favoriteHobbies } = req.body;

      const updateData = {};
      if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications;
      if (favoriteHobbies && Array.isArray(favoriteHobbies)) updateData.favoriteHobbies = favoriteHobbies;

      const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
      if (!user) return res.status(404).json({ message: 'משתמש לא נמצא' });

      res.status(200).json({
        message: 'הגדרות עודכנו בהצלחה',
        user: {
          emailNotifications: user.emailNotifications,
          favoriteHobbies: user.favoriteHobbies
        }
      });
    } catch (error) {
      console.error('Error updating profile settings:', error);
      res.status(500).json({ message: 'שגיאה בעדכון ההגדרות' });
    }
  }
};

// 🟢 פונקציה משולבת לבדיקת והענקת הישגים
const checkAndAwardAchievements = async (user, courseProgress) => {
  try {
    const achievements = [];

    // הערה: קוד זה מניח ש-user.achievements הוא מערך של אובייקטים (Subdocuments).
    // אם הוא מוגדר כ-ObjectIds ב-Schema, יש לייצר אותם קודם בטבלת Achievements ולדחוף את ה-ID שלהם לכאן.

    if (courseProgress.progress === 100 && !user.achievements.some(a => a.type === 'first_course_completed')) {
      achievements.push({
        type: 'first_course_completed',
        title: 'First Course Completed! 🎓',
        description: 'Congratulations on completing your first English course!',
        icon: '🎓'
      });
    }

    if (user.streakDays >= 7 && !user.achievements.some(a => a.type === 'streak_7_days')) {
      achievements.push({
        type: 'streak_7_days',
        title: 'Week Warrior! 🔥',
        description: 'You studied for 7 days in a row!',
        icon: '🔥'
      });
    }

    const passedQuizzes = user.quizResults?.filter(r => r.passed).length || 0;
    if (passedQuizzes >= 10 && !user.achievements.some(a => a.type === 'quiz_master')) {
      achievements.push({
        type: 'quiz_master',
        title: 'Quiz Master! 🧠',
        description: 'You passed 10 quizzes successfully!',
        icon: '🧠'
      });
    }

    const currentLevelIndex = ['beginner', 'intermediate', 'advanced'].indexOf(user.englishLevel);
    if (currentLevelIndex > 0) {
      const prevLevel = ['beginner', 'intermediate', 'advanced'][currentLevelIndex - 1];
      const achievementType = `level_up_${user.englishLevel}`;
      if (!user.achievements.some(a => a.type === achievementType)) {
        achievements.push({
          type: achievementType,
          title: `Level Up to ${user.englishLevel}! ⬆️`,
          description: `Congratulations! You've advanced from ${prevLevel} to ${user.englishLevel} level.`,
          icon: '⬆️'
        });
      }
    }

    if (achievements.length > 0) {
      user.achievements.push(...achievements);
    }
  } catch (err) {
    console.error('Error checking achievements:', err);
  }
};