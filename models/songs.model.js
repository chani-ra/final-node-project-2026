import { Schema, model } from "mongoose";

const songSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "",
    },

    theme: {
      type: String,
      required: true,
      trim: true,
    },

    duration: {
      type: String,
      required: true,
      trim: true,
    },

    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "מתחילים", "בינוני", "מתקדמים"],
      required: true,
      index: true,
    },

    category: {
      type: String,
      enum: ["grammar", "vocabulary", "conversation", "reading", "listening", "general"],
      default: "listening",
      index: true,
    },

    targetAge: {
      type: String,
      required: true,
      trim: true,
    },

    targetAges: {
      min: { type: Number, default: 6, min: 4, max: 120 },
      max: { type: Number, default: 120, min: 4, max: 120 },
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
      required: true,
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

    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },

    isWeeklySong: {
      type: Boolean,
      default: false,
      index: true,
    },

    weeklySelectedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

songSchema.index({ isPublic: 1, level: 1, category: 1 });
songSchema.index({ uploadedBy: 1, createdAt: -1 });
songSchema.index({ isWeeklySong: 1, weeklySelectedAt: -1 });

export default model("song", songSchema);