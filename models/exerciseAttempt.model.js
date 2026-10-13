
import mongoose from "mongoose";

const answerSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  correct: { type: Boolean, default: null },
  feedback: { type: String, default: "" },
  correctAnswer: { type: String, default: "" },
}, { _id: false });

const attemptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
    index: true,
  },
  exercise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exercise",
    required: true,
    index: true,
  },
  answers: { type: [answerSchema], default: [] },
  score: { type: Number, default: null, min: 0, max: 100 },
  status: {
    type: String,
    enum: ["graded", "needs_review", "pending"],
    default: "pending",
  },
}, { timestamps: true });

attemptSchema.index({
  user: 1,
  course: 1,
  exercise: 1,
  createdAt: -1,
});

export default mongoose.model("ExerciseAttempt", attemptSchema);
