import Quiz from '../models/quiz.model.js';
import User from '../models/users.model.js';
import Course from '../models/course.model.js';
import { EmailService } from '../service/emailService.js';

export const QuizController = {
  // ➕ יצירת בחן חדש
  createQuiz: async (req, res) => {
    try {
      const { title, description, courseId, englishLevel, quizType, questions, duration, passingScore } = req.body;
      const teacherId = req.user.id;

      const teacher = await User.findById(teacherId);
      if (!teacher || teacher.role !== 'teacher') {
        return res.status(403).json({ message: 'רק מורים יכולים ליצור בחנים' });
      }

      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'קורס לא נמצא' });
      }
      if (course.instructorId.toString() !== teacherId) {
        return res.status(403).json({ message: 'אתה יכול ליצור בחנים רק לקורסים שלך' });
      }

      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: 'חובה להוסיף לפחות שאלה אחת' });
      }

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.question || !q.correctAnswer) {
          return res.status(400).json({ message: `שאלה ${i + 1}: טקסט השאלה ותשובה נכונה חובה` });
        }
      }

      const newQuiz = new Quiz({
        title: title.trim(),
        description: description?.trim() || '',
        courseId,
        englishLevel,
        quizType,
        questions,
        duration: duration || 30,
        passingScore: passingScore || 70,
        createdBy: teacherId
      });

      await newQuiz.save();

      course.quizzes.push(newQuiz._id);
      await course.save();

      res.status(201).json({
        message: 'בחן נוצר בהצלחה',
        quiz: newQuiz
      });

    } catch (error) {
      console.error('Error creating quiz:', error);
      res.status(400).json({ message: error.message });
    }
  },

  // 📖 קבלת בחנים של קורס
  getQuizzesByCourse: async (req, res) => {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;

      const course = await Course.findById(courseId);
      if (!course) return res.status(404).json({ message: 'קורס לא נמצא' });

      const user = userId ? await User.findById(userId) : null;
      const isEnrolled = user && (course.enrolledStudents.includes(userId) || course.instructorId.toString() === userId);

      if (!isEnrolled) {
        return res.status(403).json({ message: 'אתה צריך להיות רשום לקורס כדי לראות את הבחנים' });
      }

      const quizzes = await Quiz.find({ courseId, isActive: true }).sort({ createdAt: -1 });

      res.status(200).json({
        quizzes,
        courseTitle: course.title
      });
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      res.status(500).json({ message: 'שגיאה בטעינת הבחנים' });
    }
  },

  // 📝 הגשת בחן (בצורה בטוחה)
  submitQuiz: async (req, res) => {
    try {
      const { quizId } = req.params;
      // מצפים ל: answers = [{ questionIndex: 0, answer: "cat" }, ...]
      const { answers, timeTaken } = req.body; 
      const userId = req.user.id;

      const quiz = await Quiz.findById(quizId);
      if (!quiz || !quiz.isActive) {
        return res.status(404).json({ message: 'בחן לא נמצא או לא פעיל' });
      }

      const course = await Course.findById(quiz.courseId);
      if (!course || !course.enrolledStudents.includes(userId)) {
        return res.status(403).json({ message: 'אתה צריך להיות רשום לקורס כדי להגיש בחן' });
      }

      let totalScore = 0;
      const detailedAnswers = [];

      // עוברים על השאלות של הבחן ומחפשים את התשובה שהמשתמש שלח
      quiz.questions.forEach((question, index) => {
        // מציאת התשובה של המשתמש לפי האינדקס
        const userAnswerObj = Array.isArray(answers) ? answers.find(a => a.questionIndex === index) : null;
        const userAnswer = userAnswerObj ? userAnswerObj.answer : '';
        
        const isCorrect = userAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
        const points = isCorrect ? (question.points || 1) : 0;

        totalScore += points;
        detailedAnswers.push({
          questionIndex: index,
          userAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect,
          points
        });
      });

      const percentage = Math.round((totalScore / quiz.totalPoints) * 100);
      const passed = percentage >= quiz.passingScore;

      const user = await User.findById(userId);
      user.quizResults.push({
        quiz: quizId,
        course: quiz.courseId,
        score: totalScore,
        totalPoints: quiz.totalPoints,
        percentage,
        passed,
        answers: detailedAnswers,
        timeTaken
      });

      // עדכון רמה קליל כפי שביקשת
      if (passed && quiz.englishLevel === user.englishLevel) {
        const levels = ['beginner', 'intermediate', 'advanced'];
        const currentIndex = levels.indexOf(user.englishLevel);
        if (currentIndex < levels.length - 1) {
          user.englishLevel = levels[currentIndex + 1];
        }
      }

      await user.save();

      if (user.emailNotifications) {
        try {
          await EmailService.sendQuizResult(user.email, user.username, quiz.title, percentage, passed);
        } catch (error) {} // לא עוצרים במקרה של שגיאת מייל
      }

      res.status(200).json({
        message: passed ? 'מזל טוב! עברת את הבחן 🎉' : 'נסה שוב! אתה יכול להשתפר 💪',
        score: totalScore,
        percentage,
        passed,
        answers: detailedAnswers,
        englishLevel: user.englishLevel
      });

    } catch (error) {
      console.error('Error submitting quiz:', error);
      res.status(500).json({ message: 'שגיאה בהגשת הבחן' });
    }
  },

  // 📊 קבלת תוצאות הבחנים של המשתמש
  getUserQuizResults: async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId)
        .populate('quizResults.quiz', 'title quizType englishLevel')
        .populate('quizResults.course', 'title');

      if (!user) return res.status(404).json({ message: 'משתמש לא נמצא' });

      const quizResults = user.quizResults.sort((a, b) => b.completedAt - a.completedAt);

      res.status(200).json({
        quizResults,
        totalQuizzes: quizResults.length,
        passedQuizzes: quizResults.filter(r => r.passed).length,
        averageScore: quizResults.length > 0
          ? Math.round(quizResults.reduce((sum, r) => sum + r.percentage, 0) / quizResults.length)
          : 0
      });
    } catch (error) {
      console.error('Error fetching quiz results:', error);
      res.status(500).json({ message: 'שגיאה בטעינת תוצאות הבחנים' });
    }
  },

  // 👨‍🏫 קבלת בחנים של מורה
  getTeacherQuizzes: async (req, res) => {
    try {
      const teacherId = req.user.id;
      const quizzes = await Quiz.find({ createdBy: teacherId })
        .populate('courseId', 'title category level')
        .sort({ createdAt: -1 });

      res.status(200).json({ quizzes });
    } catch (error) {
      console.error('Error fetching teacher quizzes:', error);
      res.status(500).json({ message: 'שגיאה בטעינת הבחנים' });
    }
  }
};