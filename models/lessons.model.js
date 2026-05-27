import { Schema, model } from "mongoose";

const lessonSchema = new Schema(
  {
    instructorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "כותרת שיעור היא חובה"],
      trim: true,
      maxlength: [200, "כותרת לא יכולה להיות יותר מ-200 תווים"],
    },

    topic: {
      type: String,
      trim: true,
      default: "",
    },

    icon: {
      type: String,
      default: "🧠",
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, "תיאור לא יכול להיות יותר מ-2000 תווים"],
      default: "",
    },

    videoUrl: {
      type: String,
      required: [true, "קובץ וידאו הוא חובה"],
    },

    videoFileName: {
      type: String,
      required: true,
    },

    videoFileSize: {
      type: Number,
      required: true,
    },

    uploadStatus: {
      type: String,
      enum: ["uploading", "processing", "completed", "failed"],
      default: "completed",
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

    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
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

    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },

    enrolledStudents: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    tags: {
      type: [String],
      default: [],
    },

    lessonLanguage: {
      type: String,
      enum: ["he", "en"],
      default: "he",
    },

    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

lessonSchema.index(
  { title: "text", description: "text", topic: "text", tags: "text" },
  { language_override: "dummyLanguage" }
);

lessonSchema.index({ instructorId: 1, createdAt: -1 });
lessonSchema.index({ isPublic: 1, createdAt: -1 });
lessonSchema.index({ category: 1, level: 1, isPublic: 1 });

export default model("Lesson", lessonSchema);