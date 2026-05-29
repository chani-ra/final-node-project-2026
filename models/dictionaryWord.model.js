import { Schema, model } from "mongoose";

const dictionaryWordSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    word: {
      type: String,
      required: true,
      trim: true,
    },

    translation: {
      type: String,
      required: true,
      trim: true,
    },

    definition: {
      type: String,
      trim: true,
      default: "",
    },

    example: {
      type: String,
      trim: true,
      default: "",
    },

    mastered: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

dictionaryWordSchema.index({ user: 1, word: 1 }, { unique: true });

export default model("DictionaryWord", dictionaryWordSchema);