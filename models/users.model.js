import { Schema, model } from "mongoose";

const userSchema = new Schema({
    username: { type: String, required: true, trim: true },
    email: { type: String, unique: true, required: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    age: { type: Number, required: true, min: 4, max: 120 },
    
    // שינוי לאנגלית בשביל ה-AI והסטנדרט המקצועי
    parentOrChild: {
        type: String,
        enum: ['parent', 'child'], 
        required: true,
    },
    // רשימת תחביבים באנגלית (ה-Frontend ישלח את זה ככה)
    favoriteHobbies: {
        type: [String],
        required: true,
        enum: ['art_music', 'sports', 'movies', 'books'] 
    },
    // מה המשתמש רוצה לשפר
    expectations: {
        type: [String],
        enum: ['grammar', 'fluent_speaking', 'confidence', 'vocabulary'],
        default: []
    },
    gender: { type: String, enum: ['male', 'female'], required: true },
    role: { type: String, enum: ['admin', 'teacher', 'user'], default: 'user' },
    
    enrolledCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
    
    courseProgress: [
      {
        course: { type: Schema.Types.ObjectId, ref: 'Course' },
        completedLessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
        completedExercises: [{ type: Schema.Types.ObjectId, ref: 'Exercise' }],
        completedSongs: [{ type: Schema.Types.ObjectId, ref: 'song' }],
        currentLesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
        progress: { type: Number, min: 0, max: 100, default: 0 },
        lastAccessedAt: { type: Date, default: Date.now },
      },
    ],
    quizResults: [
      {
        quiz: { type: Schema.Types.ObjectId, ref: 'Quiz' },
        course: { type: Schema.Types.ObjectId, ref: 'Course' },
        score: { type: Number, required: true },
        passed: { type: Boolean, required: true },
        completedAt: { type: Date, default: Date.now }
      }
    ],
    englishLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    }
}, { timestamps: true });

export default model('User', userSchema);