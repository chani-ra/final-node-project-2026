import { Schema, model } from "mongoose";

// One document per UTC day; all reservations are atomic within that document.
// Never store prompts, API keys or personally identifying data beyond user IDs.
const schema = new Schema({
  _id: { type: String, required: true },
  total: { type: Number, default: 0 },
  users: { type: Schema.Types.Mixed, default: {} },
  lastClaim: { type: String },
  createdAt: { type: Date, default: Date.now },
});

schema.index({ createdAt: 1 }, { expireAfterSeconds: 3 * 24 * 60 * 60 });

export default model("LearningDailyQuota", schema);
