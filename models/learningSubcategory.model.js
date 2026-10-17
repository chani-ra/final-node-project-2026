import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    category: {
      type: Schema.Types.ObjectId,
      ref: "LearningCategory",
      required: true,
      index: true,
    },
    slug: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
  },
  { timestamps: true }
);

schema.index({ category: 1, slug: 1 }, { unique: true });

export default model("LearningSubcategory", schema);
