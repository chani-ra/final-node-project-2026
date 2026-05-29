import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "שם משתמש חובה"],
      trim: true,
      minlength: [2, "שם חייב להכיל לפחות 2 תווים"],
      maxlength: [80, "שם לא יכול להיות יותר מ-80 תווים"],
    },

    email: {
      type: String,
      unique: true,
      required: [true, "אימייל חובה"],
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "סיסמה חובה"],
      minlength: [6, "סיסמה חייבת להכיל לפחות 6 תווים"],
    },

    phone: {
      type: String,
      required: [true, "מספר טלפון חובה"],
      trim: true,
    },

    age: {
      type: Number,
      required: [true, "גיל חובה"],
      min: [4, "גיל מינימלי הוא 4"],
      max: [120, "גיל מקסימלי הוא 120"],
    },

    gender: {
      type: String,
      enum: ["male", "female"],
      required: [true, "יש לבחור מגדר"],
    },

    parentOrChild: {
      type: String,
      enum: ["parent", "child"],
      required: [true, "יש לבחור האם מדובר בילד או הורה"],
    },

    favoriteHobbies: {
      type: [String],
      enum: ["art_music", "sports", "movies", "books"],
      default: [],
    },

    expectations: {
      type: [String],
      enum: ["grammar", "fluent_speaking", "confidence", "vocabulary"],
      default: [],
    },

    englishLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },

    role: {
      type: String,
      enum: ["admin", "teacher", "student"],
      default: "student",
      index: true,
    },

    enrolledCourses: [
      {
        type: Schema.Types.ObjectId,
        ref: "Course",
      },
    ],

    courseProgress: [
      {
        course: {
          type: Schema.Types.ObjectId,
          ref: "Course",
        },
        completedLessons: [
          {
            type: Schema.Types.ObjectId,
            ref: "Lesson",
          },
        ],
        completedExercises: [
          {
            type: Schema.Types.ObjectId,
            ref: "Exercise",
          },
        ],
        completedSongs: [
          {
            type: Schema.Types.ObjectId,
            ref: "song",
          },
        ],
        currentLesson: {
          type: Schema.Types.ObjectId,
          ref: "Lesson",
        },
        progress: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
        },
        startedAt: {
          type: Date,
          default: Date.now,
        },
        lastAccessedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    quizResults: [
      {
        quiz: {
          type: Schema.Types.ObjectId,
          ref: "Quiz",
        },
        course: {
          type: Schema.Types.ObjectId,
          ref: "Course",
        },
        score: {
          type: Number,
          required: true,
        },
        totalPoints: {
          type: Number,
          default: 0,
        },
        percentage: {
          type: Number,
          default: 0,
        },
        passed: {
          type: Boolean,
          required: true,
        },
        answers: [
          {
            questionIndex: Number,
            userAnswer: String,
            correctAnswer: String,
            isCorrect: Boolean,
            points: Number,
          },
        ],
        timeTaken: Number,
        completedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    grammarHistory: [
      {
        original: String,
        corrected: String,
        explanation: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    totalStudyTime: {
      type: Number,
      default: 0,
    },

    streakDays: {
      type: Number,
      default: 0,
    },

    lastStudyDate: {
      type: Date,
    },

    emailNotifications: {
      type: Boolean,
      default: true,
    },
    coachHistory: [
  {
    note: {
      type: String,
      trim: true,
    },
    plan: {
      focus: String,
      summary: String,
      steps: [String],
      tip: String,
      encouragement: String,
      estimatedMinutes: Number,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
],

    achievements: [
      {
        type: {
          type: String,
        },
        title: String,
        description: String,
        icon: String,
        awardedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

export default model("User", userSchema);