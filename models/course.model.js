import { Schema, model } from "mongoose";

const courseSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "שם הקורס חובה"],
      trim: true,
      maxlength: [200, "שם קורס לא יכול להיות יותר מ-200 תווים"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, "תיאור לא יכול להיות יותר מ-2000 תווים"],
      default: "",
    },

    instructorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // אם הקורס נוצר במיוחד עבור תלמיד מסוים
    createdFor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    createdByAI: {
      type: Boolean,
      default: false,
      index: true,
    },

    aiReason: {
      type: String,
      default: "",
      maxlength: [3000, "הסבר AI לא יכול להיות יותר מ-3000 תווים"],
    },

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
      required: true,
    },

    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },

    lessons: [{ type: Schema.Types.ObjectId, ref: "Lesson" }],
    songs: [{ type: Schema.Types.ObjectId, ref: "song" }],
    exercises: [{ type: Schema.Types.ObjectId, ref: "Exercise" }],
    quizzes: [{ type: Schema.Types.ObjectId, ref: "Quiz" }],

    enrolledStudents: [{ type: Schema.Types.ObjectId, ref: "User" }],

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
  },
  { timestamps: true }
);

courseSchema.index({ createdFor: 1, createdByAI: 1 });
courseSchema.index({ category: 1, level: 1, isPublic: 1 });

export default model("Course", courseSchema);