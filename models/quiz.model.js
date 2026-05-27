import { Schema, model } from "mongoose";

const quizSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "כותרת בוחן חובה"],
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },

    englishLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
      index: true,
    },

    quizType: {
      type: String,
      enum: ["grammar", "vocabulary", "reading", "listening", "writing", "mixed"],
      required: true,
      index: true,
    },

    questions: [
      {
        question: {
          type: String,
          required: true,
        },

        questionType: {
          type: String,
          enum: ["multiple-choice", "true-false", "fill-blank", "short-answer"],
          default: "multiple-choice",
        },

        options: [{ type: String }],

        correctAnswer: {
          type: String,
          required: true,
        },

        explanation: {
          type: String,
          default: "",
        },

        points: {
          type: Number,
          default: 1,
        },

        difficulty: {
          type: String,
          enum: ["easy", "medium", "hard"],
          default: "medium",
        },
      },
    ],

    totalPoints: {
      type: Number,
      default: 0,
    },

    passingScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 70,
    },

    duration: {
      type: Number,
      required: true,
      default: 30,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // שדות התאמה ל-AI
    category: {
      type: String,
      enum: [
        "grammar",
        "vocabulary",
        "conversation",
        "reading",
        "listening",
        "general",
      ],
      default: "general",
      index: true,
    },

    targetAges: {
      min: {
        type: Number,
        default: 6,
      },
      max: {
        type: Number,
        default: 120,
      },
    },

    hobbies: {
      type: [String],
      enum: ["art_music", "sports", "movies", "books"],
      default: [],
      index: true,
    },

    expectations: {
      type: [String],
      enum: ["grammar", "fluent_speaking", "confidence", "vocabulary"],
      default: [],
      index: true,
    },

    generatedByAI: {
      type: Boolean,
      default: false,
    },

    approvedByTeacher: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

quizSchema.pre("save", function (next) {
  this.totalPoints = this.questions.reduce(
    (sum, q) => sum + (q.points || 1),
    0
  );

  next();
});

quizSchema.index({ englishLevel: 1, quizType: 1, isPublic: 1 });
quizSchema.index({ category: 1, isActive: 1, isPublic: 1 });
quizSchema.index({ createdBy: 1, createdAt: -1 });

export default model("Quiz", quizSchema);