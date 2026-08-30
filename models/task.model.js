import { Schema, model } from "mongoose";

const taskSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "כותרת משימה חובה"],
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    type: {
      type: String,
      enum: ["teacher_task", "coach_task", "exercise", "lesson", "song", "quiz", "manual"],
      default: "manual",
      index: true,
    },

    source: {
      type: String,
      enum: ["teacher", "ai_coach", "system", "student"],
      default: "system",
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "review", "completed"],
      default: "pending",
      index: true,
    },

    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Easy",
    },

    estimatedTime: {
      type: String,
      default: "10 דקות",
    },

    rewardXP: {
      type: Number,
      default: 50,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    relatedExercise: {
      type: Schema.Types.ObjectId,
      ref: "Exercise",
      default: null,
    },

    relatedLesson: {
      type: Schema.Types.ObjectId,
      ref: "Lesson",
      default: null,
    },

    relatedSong: {
      type: Schema.Types.ObjectId,
      ref: "Song",
      default: null,
    },

    coachPlanFocus: {
      type: String,
      trim: true,
      default: "",
    },

    planGroupId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    planTitle: {
      type: String,
      trim: true,
      default: "",
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    grade: {
      type: Number,
      default: null,
    },

    feedback: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

taskSchema.index({ user: 1, status: 1, createdAt: -1 });
taskSchema.index({ user: 1, planGroupId: 1 });

export default model("Task", taskSchema);