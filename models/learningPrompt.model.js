import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: {
      type: Schema.Types.ObjectId,
      ref: "LearningCategory",
      required: true,
    },
    subcategory: {
      type: Schema.Types.ObjectId,
      ref: "LearningSubcategory",
      required: true,
    },
    prompt: { type: String, required: true, trim: true, maxlength: 800 },
    response: { type: String, required: true, maxlength: 20000 },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
    provider: { type: String, enum: ["gemini", "openai"], default: "gemini" },
    model: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

schema.index({ user: 1, createdAt: -1 });
schema.index({ category: 1, subcategory: 1, createdAt: -1 });

export default model("LearningPrompt", schema);
