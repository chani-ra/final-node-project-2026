import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    slug: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
  },
  { timestamps: true }
);

export default model("LearningCategory", schema);
