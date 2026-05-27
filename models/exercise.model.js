import { Schema, model } from "mongoose";

const exerciseSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "כותרת תרגיל חובה"],
      trim: true,
      maxlength: [200, "כותרת לא יכולה להיות יותר מ-200 תווים"],
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: [2000, "תיאור לא יכול להיות יותר מ-2000 תווים"],
    },

    instructions: {
      type: String,
      default: "",
      trim: true,
      maxlength: [3000, "הוראות לא יכולות להיות יותר מ-3000 תווים"],
    },

    type: {
      type: String,
      enum: ["homework", "practice", "project"],
      default: "practice",
    },

    materials: [{ type: String }],

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

exerciseSchema.index({ category: 1, level: 1, isPublic: 1 });
exerciseSchema.index({ createdBy: 1, createdAt: -1 });

export default model("Exercise", exerciseSchema);