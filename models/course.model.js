import { Schema, model } from "mongoose";

const courseSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'שם הקורס חובה'],
      trim: true,
      maxlength: [200, 'שם קורס לא יכול להיות יותר מ-200 תווים'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'תיאור לא יכול להיות יותר מ-2000 תווים'],
      default: '',
    },
    instructorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true, // עבור קורס AI, כאן נשמור את ה-ID של ה-AI או של המנהל
    },
    category: {
      type: String,
      enum: [
        'grammar', 'vocabulary', 'conversation', 'reading', 'listening', 'general'
      ],
      required: true,
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    lessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
    songs: [{ type: Schema.Types.ObjectId, ref: 'song' }], // נשאר כפי שביקשת
    exercises: [{ type: Schema.Types.ObjectId, ref: 'Exercise' }],
    quizzes: [{ type: Schema.Types.ObjectId, ref: 'Quiz' }], // מחקנו את ה-Exams, נשאר רק Quiz
    
    enrolledStudents: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    isPublic: {
      type: Boolean,
      default: false, // קורס שנוצר על ידי AI יהיה false, ורק התלמיד שנרשם אליו יראה אותו!
      index: true,
    },
    totalViews: { type: Number, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
  },
  { timestamps: true }
);

export default model('Course', courseSchema);