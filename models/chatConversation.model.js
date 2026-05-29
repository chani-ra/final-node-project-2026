import { Schema, model } from "mongoose";

const chatMessageSchema = new Schema(
  {
    sender: {
      type: String,
      enum: ["user", "ai"],
      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const chatConversationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      trim: true,
      default: "שיחה חדשה עם בולט",
    },

    messages: {
      type: [chatMessageSchema],
      default: [],
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

chatConversationSchema.index({ user: 1, lastMessageAt: -1 });

export default model("ChatConversation", chatConversationSchema);