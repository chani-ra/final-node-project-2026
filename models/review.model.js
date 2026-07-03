import { Schema, model } from "mongoose";

const reviewSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    usernameSnapshot: {
      type: String,
      required: true,
      trim: true,
    },

    roleSnapshot: {
      type: String,
      enum: ["student", "teacher", "admin"],
      required: true,
      index: true,
    },

    text: {
      type: String,
      required: [true, "תוכן ההמלצה חובה"],
      trim: true,
      minlength: [10, "המלצה חייבת להכיל לפחות 10 תווים"],
      maxlength: [700, "המלצה לא יכולה להיות יותר מ-700 תווים"],
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    adminNote: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

reviewSchema.index({ status: 1, createdAt: -1 });

export default model("Review", reviewSchema);