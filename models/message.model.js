import { Schema, model } from "mongoose";

const messageSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "כותרת הודעה חובה"],
      trim: true,
      maxlength: [200, "כותרת לא יכולה להיות יותר מ-200 תווים"],
    },

    body: {
      type: String,
      required: [true, "תוכן הודעה חובה"],
      trim: true,
      maxlength: [5000, "הודעה לא יכולה להיות יותר מ-5000 תווים"],
    },

    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    recipients: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        isRead: {
          type: Boolean,
          default: false,
        },
        readAt: {
          type: Date,
          default: null,
        },
      },
    ],

    targetType: {
      type: String,
      enum: ["all", "students", "teachers", "admins", "single"],
      required: true,
      index: true,
    },

    targetUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    messageType: {
      type: String,
      enum: ["announcement", "feedback", "system"],
      default: "announcement",
    },

    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
    },
  },
  { timestamps: true }
);

messageSchema.index({ createdAt: -1 });
messageSchema.index({ "recipients.user": 1, createdAt: -1 });

export default model("Message", messageSchema);