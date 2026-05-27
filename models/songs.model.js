import { Schema, model } from "mongoose";

const songSchema = new Schema(
  {
    theme: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      default: "",
      trim: true,
    },

    duration: {
      type: String,
      required: true,
    },

    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "מתחילים", "בינוני", "מתקדמים"],
      required: true,
      index: true,
    },

    targetAge: {
      type: String,
      required: true,
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

    composer: {
      type: String,
      required: true,
      trim: true,
    },

    lyricist: {
      type: String,
      required: true,
      trim: true,
    },

    audioFileName: {
      type: String,
    },

    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    lesson: {
      type: Schema.Types.ObjectId,
      ref: "Lesson",
      default: null,
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
      default: "listening",
      index: true,
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
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

songSchema.index({ uploadedBy: 1, createdAt: -1 });
songSchema.index({ category: 1, level: 1, isPublic: 1 });

export default model("song", songSchema);