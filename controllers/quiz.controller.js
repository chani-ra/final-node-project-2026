import Quiz from "../models/quiz.model.js";
import User from "../models/users.model.js";
import Course from "../models/course.model.js";
import { EmailService } from "../service/emailService.js";
import { markQuizCompleted } from "../service/progress.service.js";

export const QuizController = {
  // ➕ יצירת בוחן חדש
  createQuiz: async (req, res) => {
    try {
      const {
        title,
        description,
        courseId,
        englishLevel,
        quizType,
        questions,
        duration,
        passingScore,

        // שדות התאמה חכמה
        category,
        targetAges,
        hobbies,
        expectations,
        isActive,
        isPublic,
        generatedByAI,
      } = req.body;

      const teacherId = req.user.id;

      const teacher = await User.findById(teacherId);

      if (!teacher || teacher.role !== "teacher") {
        return res.status(403).json({
          message: "רק מורים יכולים ליצור בחנים",
        });
      }

      if (!title?.trim()) {
        return res.status(400).json({
          message: "כותרת בוחן חובה",
        });
      }

      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
          message: "חובה להוסיף לפחות שאלה אחת",
        });
      }

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        if (!q.question || !q.correctAnswer) {
          return res.status(400).json({
            message: `שאלה ${i + 1}: טקסט השאלה ותשובה נכונה חובה`,
          });
        }

        if (
          q.questionType === "multiple-choice" &&
          (!Array.isArray(q.options) || q.options.length < 2)
        ) {
          return res.status(400).json({
            message: `שאלה ${i + 1}: בשאלה אמריקאית חייבות להיות אפשרויות`,
          });
        }
      }

      let course = null;

      // אם המורה בחרה קורס ספציפי — נשייך אליו
      // אם לא — הבוחן נשמר כבוחן חכם כללי לפי תגיות
      if (courseId) {
        course = await Course.findById(courseId);

        if (!course) {
          return res.status(404).json({
            message: "קורס לא נמצא",
          });
        }

        if (course.instructorId.toString() !== teacherId) {
          return res.status(403).json({
            message: "את יכולה ליצור בחנים רק לקורסים שלך",
          });
        }
      }

      const newQuiz = new Quiz({
        title: title.trim(),
        description: description?.trim() || "",
        courseId: courseId || null,

        englishLevel: englishLevel || "beginner",
        quizType: quizType || "mixed",

        questions,
        duration: Number(duration) || 30,
        passingScore: Number(passingScore) || 70,

        isActive: isActive !== false,
        isPublic: isPublic === true,

        createdBy: teacherId,

        category: category || "general",
        targetAges: targetAges || {
          min: 6,
          max: 120,
        },
        hobbies: Array.isArray(hobbies) ? hobbies : [],
        expectations: Array.isArray(expectations) ? expectations : [],

        generatedByAI: Boolean(generatedByAI),
        approvedByTeacher: true,
      });

      await newQuiz.save();

      // אם יש קורס ספציפי — מכניסים אותו גם למערך quizzes של הקורס
      if (course) {
        course.quizzes.push(newQuiz._id);
        await course.save();
      }

      return res.status(201).json({
        message: course
          ? "בחן נוצר ושויך לקורס בהצלחה"
          : "בחן חכם נוצר בהצלחה ויוכל להשתלב במסלולים לפי התאמה",
        quiz: newQuiz,
      });
    } catch (error) {
      console.error("Error creating quiz:", error);
      return res.status(400).json({
        message: error.message,
      });
    }
  },

  // ✏️ עריכת בוחן על ידי המורה שיצרה אותו
  updateQuiz: async (req, res) => {
    try {
      const { quizId } = req.params;
      const teacherId = req.user.id;

      const {
        title,
        description,
        englishLevel,
        quizType,
        questions,
        duration,
        passingScore,
        isActive,
        isPublic,
        category,
        targetAges,
        hobbies,
        expectations,
      } = req.body;

      const quiz = await Quiz.findById(quizId);

      if (!quiz) {
        return res.status(404).json({
          message: "בוחן לא נמצא",
        });
      }

      if (quiz.createdBy.toString() !== teacherId && req.user.role !== "admin") {
        return res.status(403).json({
          message: "אפשר לערוך רק בחנים שאת יצרת",
        });
      }

      if (title !== undefined) quiz.title = title.trim();
      if (description !== undefined) quiz.description = description?.trim() || "";
      if (englishLevel !== undefined) quiz.englishLevel = englishLevel;
      if (quizType !== undefined) quiz.quizType = quizType;
      if (duration !== undefined) quiz.duration = Number(duration) || 30;

      if (passingScore !== undefined) {
        quiz.passingScore = Number(passingScore) || 70;
      }

      if (isActive !== undefined) quiz.isActive = Boolean(isActive);
      if (isPublic !== undefined) quiz.isPublic = Boolean(isPublic);

      if (category !== undefined) quiz.category = category || "general";

      if (targetAges !== undefined) {
        quiz.targetAges = {
          min: Number(targetAges?.min) || 6,
          max: Number(targetAges?.max) || 120,
        };
      }

      if (hobbies !== undefined) {
        quiz.hobbies = Array.isArray(hobbies) ? hobbies : [];
      }

      if (expectations !== undefined) {
        quiz.expectations = Array.isArray(expectations) ? expectations : [];
      }

      if (questions !== undefined) {
        if (!Array.isArray(questions) || questions.length === 0) {
          return res.status(400).json({
            message: "חובה להשאיר לפחות שאלה אחת בבוחן",
          });
        }

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];

          if (!q.question || !q.correctAnswer) {
            return res.status(400).json({
              message: `שאלה ${i + 1}: טקסט השאלה ותשובה נכונה חובה`,
            });
          }

          if (
            q.questionType === "multiple-choice" &&
            (!Array.isArray(q.options) || q.options.length < 2)
          ) {
            return res.status(400).json({
              message: `שאלה ${i + 1}: בשאלה אמריקאית חייבות להיות לפחות 2 אפשרויות`,
            });
          }
        }

        quiz.questions = questions;
      }

      await quiz.save();

      return res.status(200).json({
        message: "הבוחן עודכן בהצלחה",
        quiz,
      });
    } catch (error) {
      console.error("Error updating quiz:", error);
      return res.status(400).json({
        message: error.message,
      });
    }
  },

  // 🔁 פרסום / החזרה לטיוטה של בוחן
  updateQuizPublishStatus: async (req, res) => {
    try {
      const { quizId } = req.params;
      const { isPublic } = req.body;
      const teacherId = req.user.id;

      const quiz = await Quiz.findById(quizId);

      if (!quiz) {
        return res.status(404).json({
          message: "בוחן לא נמצא",
        });
      }

      if (quiz.createdBy.toString() !== teacherId && req.user.role !== "admin") {
        return res.status(403).json({
          message: "אפשר לעדכן רק בחנים שאת יצרת",
        });
      }

      quiz.isPublic = Boolean(isPublic);
      quiz.isActive = true;

      await quiz.save();

      return res.status(200).json({
        message: quiz.isPublic
          ? "הבוחן פורסם ויכול להיכנס למסלולים אישיים"
          : "הבוחן הוחזר לטיוטה",
        quiz,
      });
    } catch (error) {
      console.error("Error updating quiz publish status:", error);
      return res.status(400).json({
        message: error.message,
      });
    }
  },

  // 🗑️ מחיקת בוחן
  deleteQuiz: async (req, res) => {
    try {
      const { quizId } = req.params;
      const teacherId = req.user.id;

      const quiz = await Quiz.findById(quizId);

      if (!quiz) {
        return res.status(404).json({
          message: "בוחן לא נמצא",
        });
      }

      if (quiz.createdBy.toString() !== teacherId && req.user.role !== "admin") {
        return res.status(403).json({
          message: "אפשר למחוק רק בחנים שאת יצרת",
        });
      }

      if (quiz.courseId) {
        await Course.findByIdAndUpdate(quiz.courseId, {
          $pull: { quizzes: quiz._id },
        });
      }

      await Quiz.findByIdAndDelete(quizId);

      return res.status(200).json({
        message: "הבוחן נמחק בהצלחה",
      });
    } catch (error) {
      console.error("Error deleting quiz:", error);
      return res.status(400).json({
        message: error.message,
      });
    }
  },

  // 📖 קבלת בחנים של קורס
  getQuizzesByCourse: async (req, res) => {
    try {
      const { courseId } = req.params;
      const userId = req.user.id;

      const course = await Course.findById(courseId);

      if (!course) {
        return res.status(404).json({
          message: "קורס לא נמצא",
        });
      }

      const isStudentEnrolled = course.enrolledStudents.some(
        (studentId) => studentId.toString() === userId.toString()
      );

      const isTeacherOfCourse =
        req.user.role === "teacher" &&
        course.instructorId.toString() === userId.toString();

      const isAdmin = req.user.role === "admin";

      if (!isStudentEnrolled && !isTeacherOfCourse && !isAdmin) {
        return res.status(403).json({
          message: "אין לך הרשאה לצפות בבחנים של קורס זה",
        });
      }

      const quizIds = course.quizzes || [];

      const quizQuery = Quiz.find({
        _id: { $in: quizIds },
        isActive: true,
      }).sort({ createdAt: -1 });

      if (!isTeacherOfCourse && !isAdmin) {
        quizQuery.select(
          "-questions.correctAnswer -questions.explanation"
        );
      }

      const quizzes = await quizQuery;

      return res.status(200).json({
        quizzes,
        courseTitle: course.title,
      });
    } catch (error) {
      console.error("Error fetching quizzes:", error);

      return res.status(500).json({
        message: "שגיאה בטעינת הבחנים",
      });
    }
  },

  // 📘 קבלת בוחן יחיד לתלמידה / מורה
  getQuizById: async (req, res) => {
    try {
      const { quizId } = req.params;
      const { courseId } = req.query;
      const userId = req.user.id;

      const quiz = await Quiz.findById(quizId);

      if (!quiz || !quiz.isActive) {
        return res.status(404).json({
          message: "בוחן לא נמצא או לא פעיל",
        });
      }

      const isTeacherOrAdmin =
        quiz.createdBy.toString() === userId || req.user.role === "admin";

      const realCourseId = courseId || quiz.courseId || null;

      if (realCourseId && !isTeacherOrAdmin) {
        const course = await Course.findById(realCourseId);

        if (!course) {
          return res.status(404).json({
            message: "קורס לא נמצא",
          });
        }

        const isEnrolled = course.enrolledStudents.some(
          (studentId) => studentId.toString() === userId
        );

        const courseContainsQuiz = course.quizzes?.some(
          (courseQuizId) => courseQuizId.toString() === quizId
        );

        if (!isEnrolled) {
          return res.status(403).json({
            message: "את צריכה להיות רשומה לקורס כדי לפתוח את הבוחן",
          });
        }

        if (!courseContainsQuiz) {
          return res.status(403).json({
            message: "הבוחן הזה לא נמצא במסלול האישי שלך",
          });
        }
      }

      const quizObject = quiz.toObject();

      // תלמידה לא מקבלת תשובות נכונות והסברים לפני הגשה
      if (!isTeacherOrAdmin) {
        quizObject.questions = quizObject.questions.map((question) => {
          const { correctAnswer, explanation, ...safeQuestion } = question;
          return safeQuestion;
        });
      }

      return res.status(200).json({
        quiz: quizObject,
      });
    } catch (error) {
      console.error("Error fetching quiz:", error);
      return res.status(500).json({
        message: "שגיאה בטעינת הבוחן",
      });
    }
  },

  // 📝 הגשת בחן בצורה שמתאימה לקורס אישי
  submitQuiz: async (req, res) => {
    try {
      const { quizId } = req.params;

      // answers = [{ questionIndex: 0, answer: "..." }, ...]
      const { answers, timeTaken, courseId: courseIdFromBody } = req.body;
      const userId = req.user.id;

      const quiz = await Quiz.findById(quizId);

      if (!quiz || !quiz.isActive) {
        return res.status(404).json({
          message: "בחן לא נמצא או לא פעיל",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          message: "משתמש לא נמצא",
        });
      }

      const isTeacherOrAdmin =
        quiz.createdBy.toString() === userId || req.user.role === "admin";

      let course = null;
      const realCourseId = courseIdFromBody || quiz.courseId || null;

      if (realCourseId) {
        course = await Course.findById(realCourseId);

        if (!course) {
          return res.status(404).json({
            message: "קורס לא נמצא",
          });
        }

        const isEnrolled = course.enrolledStudents.some(
          (studentId) => studentId.toString() === userId
        );

        const courseContainsQuiz = course.quizzes?.some(
          (courseQuizId) => courseQuizId.toString() === quizId
        );

        if (!isEnrolled && !isTeacherOrAdmin) {
          return res.status(403).json({
            message: "את צריכה להיות רשומה לקורס כדי להגיש את הבוחן",
          });
        }

        if (!courseContainsQuiz && !isTeacherOrAdmin) {
          return res.status(403).json({
            message: "הבוחן הזה לא נמצא במסלול האישי שלך",
          });
        }
      } else {
        if (!isTeacherOrAdmin && !quiz.isPublic) {
          return res.status(400).json({
            message: "חסר מזהה קורס להגשת הבוחן",
          });
        }
      }

      let totalScore = 0;
      const detailedAnswers = [];

      quiz.questions.forEach((question, index) => {
        const userAnswerObj = Array.isArray(answers)
          ? answers.find((a) => Number(a.questionIndex) === index)
          : null;

        const userAnswer = userAnswerObj
          ? String(userAnswerObj.answer || "")
          : "";

        const isCorrect =
          userAnswer.toLowerCase().trim() ===
          String(question.correctAnswer || "").toLowerCase().trim();

        const points = isCorrect ? question.points || 1 : 0;

        totalScore += points;

        detailedAnswers.push({
          questionIndex: index,
          userAnswer,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation || "",
          isCorrect,
          points,
        });
      });

      const totalPoints =
        quiz.totalPoints ||
        quiz.questions.reduce(
          (sum, question) => sum + (question.points || 1),
          0
        );

      const percentage =
        totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;

      const passed = percentage >= quiz.passingScore;

      user.quizResults.push({
        quiz: quizId,
        course: realCourseId,
        score: totalScore,
        totalPoints,
        percentage,
        passed,
        answers: detailedAnswers,
        timeTaken,
        completedAt: new Date(),
      });

      // עדכון completedQuizzes בתוך courseProgress של הקורס האישי
      if (realCourseId) {
        await markQuizCompleted(
          userId,
          realCourseId,
          quizId
        );
      }

      // עדכון רמה קליל
      if (passed && quiz.englishLevel === user.englishLevel) {
        const levels = ["beginner", "intermediate", "advanced"];
        const currentIndex = levels.indexOf(user.englishLevel);

        if (currentIndex >= 0 && currentIndex < levels.length - 1) {
          user.englishLevel = levels[currentIndex + 1];
        }
      }

      await user.save();

      if (user.emailNotifications) {
        try {
          await EmailService.sendQuizResult(
            user.email,
            user.username,
            quiz.title,
            percentage,
            passed
          );
        } catch (error) {
          console.error(
            "Error sending quiz result email:",
            error.message || error
          );
        }
      }

      return res.status(200).json({
        message: passed
          ? "מזל טוב! עברת את הבחן 🎉"
          : "סיימת את הבחן. אפשר להשתפר ולנסות שוב 💪",
        score: totalScore,
        totalPoints,
        percentage,
        passed,
        answers: detailedAnswers,
        englishLevel: user.englishLevel,
      });
    } catch (error) {
      console.error("Error submitting quiz:", error);
      return res.status(500).json({
        message: "שגיאה בהגשת הבחן",
      });
    }
  },

  // 📊 קבלת תוצאות הבחנים של המשתמש
  getUserQuizResults: async (req, res) => {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId)
        .populate("quizResults.quiz", "title quizType englishLevel")
        .populate("quizResults.course", "title");

      if (!user) {
        return res.status(404).json({
          message: "משתמש לא נמצא",
        });
      }

      const quizResults = [...(user.quizResults || [])].sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateB - dateA;
      });

      return res.status(200).json({
        quizResults,
        totalQuizzes: quizResults.length,
        passedQuizzes: quizResults.filter((result) => result.passed).length,
        averageScore:
          quizResults.length > 0
            ? Math.round(
              quizResults.reduce(
                (sum, result) => sum + (result.percentage || 0),
                0
              ) / quizResults.length
            )
            : 0,
      });
    } catch (error) {
      console.error("Error fetching quiz results:", error);
      return res.status(500).json({
        message: "שגיאה בטעינת תוצאות הבחנים",
      });
    }
  },

  // 👨‍🏫 קבלת בחנים של מורה
  getTeacherQuizzes: async (req, res) => {
    try {
      const teacherId = req.user.id;

      const quizzes = await Quiz.find({
        createdBy: teacherId,
      })
        .populate("courseId", "title category level")
        .sort({
          createdAt: -1,
        });

      return res.status(200).json({
        quizzes,
      });
    } catch (error) {
      console.error("Error fetching teacher quizzes:", error);
      return res.status(500).json({
        message: "שגיאה בטעינת הבחנים",
      });
    }
  },
};