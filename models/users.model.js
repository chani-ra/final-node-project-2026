import { Schema, model } from "mongoose";

const userSchema = new Schema({
    username: String,
    email: { type: String, unique: true },
    password: String,
    phone: String,
    address: {
     
            country: String,
            city: String,
            street: String,
      
    },
    age: {
        type: Number,
        required: true,
        min: 0,
        max: 120,
    },
    parentOrChild: {
        type: String,
        enum: ['הורה', 'ילד'],
        required: true,
    },
    favoriteHobbies: {
        type: [String],
        required: true,
        enum: ['אומנות ומוזיקה', 'פעילויות', 'צפיה בסרטים', 'קריאת ספרים']
    },
    gender: { type: String, enum: ['male', 'female'], required: true },
    role: { type: String, enum: ['admin', 'teacher', 'user'], default: 'user' },
    enrolledCourses: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],
    courseProgress: [
      {
        course: { type: Schema.Types.ObjectId, ref: 'Course' },
        completedLessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
        completedExercises: [{ type: Schema.Types.ObjectId, ref: 'Exercise' }],
        completedSongs: [{ type: Schema.Types.ObjectId, ref: 'song' }],
        currentLesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
        progress: { type: Number, min: 0, max: 100, default: 0 },
        startedAt: { type: Date, default: Date.now },
        lastAccessedAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    quizResults: [
      {
        quiz: { type: Schema.Types.ObjectId, ref: 'Quiz' },
        course: { type: Schema.Types.ObjectId, ref: 'Course' },
        score: { type: Number, required: true },
        totalPoints: { type: Number, required: true },
        percentage: { type: Number, required: true },
        passed: { type: Boolean, required: true },
        answers: [{
          questionIndex: { type: Number, required: true },
          userAnswer: { type: String, required: true },
          correctAnswer: { type: String, required: true },
          isCorrect: { type: Boolean, required: true },
          points: { type: Number, default: 0 }
        }],
        timeTaken: { type: Number }, // בדקות
        completedAt: { type: Date, default: Date.now }
      }
    ],
    englishLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    totalStudyTime: { type: Number, default: 0 }, // בדקות
    streakDays: { type: Number, default: 0 }, // ימים רצופים של לימוד
    lastStudyDate: { type: Date },
    achievements: [{
      type: { type: String, required: true }, // 'course_completed', 'quiz_passed', 'streak_7_days' וכו'
      title: { type: String, required: true },
      description: { type: String, required: true },
      earnedAt: { type: Date, default: Date.now },
      icon: { type: String, default: '🏆' }
    }],
    emailNotifications: {
      type: Boolean,
      default: true
    },
    songs: [{ type: Schema.Types.ObjectId, ref: 'song' }]
}, {
    timestamps: true
});

export default model('User', userSchema);