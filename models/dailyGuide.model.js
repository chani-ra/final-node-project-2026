import { Schema, model } from "mongoose";

const dailyGuideStepSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    action: {
      type: String,
      required: true,
      enum: [
        "OPEN_CHAT",
        "OPEN_DICTIONARY",
        "OPEN_TASKS",
        "OPEN_COURSES",
        "OPEN_WRITING",
      ],
    },

    estimatedMinutes: {
      type: Number,
      required: true,
      min: 5,
      max: 30,
    },
  },
  {
    _id: false,
  }
);

const dailyGuideModelSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    dateKey: {
      type: String,
      required: true,
      trim: true,
    },

    focus: {
      type: String,
      required: true,
      trim: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    steps: {
      type: [dailyGuideStepSchema],
      required: true,

      validate: {
        validator: (steps) =>
          Array.isArray(steps) &&
          steps.length === 3,

        message:
          "Daily guide must contain exactly 3 steps",
      },
    },

    tip: {
      type: String,
      required: true,
      trim: true,
    },

    encouragement: {
      type: String,
      required: true,
      trim: true,
    },

    estimatedMinutes: {
      type: Number,
      required: true,
      min: 10,
      max: 60,
    },

    toolsUsed: {
      type: [String],
      default: [],
    },

    isFallback: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

dailyGuideModelSchema.index(
  {
    user: 1,
    dateKey: 1,
  },
  {
    unique: true,
  }
);

export default model(
  "DailyGuide",
  dailyGuideModelSchema
);