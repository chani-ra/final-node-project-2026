import mongoose from "mongoose";

const schema = new mongoose.Schema({
  exercise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exercise",
    unique: true,
    required: true,
  },
  entries: [{
    answer: { type: String, required: true },
    explanation: { type: String, default: "" },
    mode: {
      type: String,
      enum: ["exact", "flexible"],
      default: "exact",
    },
  }],
}, { timestamps: true });

export default mongoose.model("ExerciseAnswerKey", schema);
