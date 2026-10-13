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
      maxlength: [5000, "הוראות לא יכולות להיות יותר מ-5000 תווים"],
    },

    type: {
      type: String,
      enum: ["homework", "practice", "project"],
      default: "practice",
    },

    category: {
      type: String,
      enum: ["grammar", "vocabulary", "conversation", "reading", "listening", "general"],
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
        min: 4,
        max: 120,
      },
      max: {
        type: Number,
        default: 120,
        min: 4,
        max: 120,
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

    questions: { type: [String], default: [] },

    materials: {
      type: [String],
      default: [],
    },

    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    createdByAI: {
      type: Boolean,
      default: false,
    },

    aiPrompt: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

exerciseSchema.index({
  title: "text",
  description: "text",
  instructions: "text",
});

exerciseSchema.index({ isPublic: 1, level: 1, category: 1 });
exerciseSchema.index({ createdBy: 1, createdAt: -1 });

export default model("Exercise", exerciseSchema);