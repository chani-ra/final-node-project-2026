import { Schema, model } from "mongoose";

const courseProgressSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    completedLessons: [
      {
        type: Schema.Types.ObjectId,
        ref: "Lesson",
      },
    ],

    completedSongs: [
      {
        type: Schema.Types.ObjectId,
        ref: "song",
      },
    ],

    completedExercises: [
      {
        type: Schema.Types.ObjectId,
        ref: "Exercise",
      },
    ],

    completedQuizzes: [
      {
        type: Schema.Types.ObjectId,
        ref: "Quiz",
      },
    ],

    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

courseProgressSchema.index(
  { user: 1, course: 1 },
  { unique: true }
);

export default model("CourseProgress", courseProgressSchema);