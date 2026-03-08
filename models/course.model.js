// models/course.model.js
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
      required: true,
    },

    category: {
      type: String,
      enum: ['תכנות', 'מוזיקה', 'ספורט', 'אומנות', 'מדע', 'שפות', 'כללי'],
      required: true,
    },

    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },

    // 📚 תוכן
    lessons: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Lesson',
      },
    ],

    songs: [
      {
        type: Schema.Types.ObjectId,
        ref: 'song',
      },
    ],

    // ✏️ תרגילים ובחנים (לוגיקה בהמשך)
    exercises: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Exercise',
      },
    ],

    quizzes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Quiz',
      },
    ],

    // 👥 סטודנטים
    enrolledStudents: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },

    totalViews: {
      type: Number,
      default: 0,
    },

    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default model('Course', courseSchema);