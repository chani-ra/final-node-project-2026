import { Schema, model } from 'mongoose';

const exerciseSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    instructions: { type: String, default: '' },
    type: {
      type: String,
      enum: ['homework', 'practice', 'project'],
      default: 'practice',
    },
    materials: [{ type: String }],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default model('Exercise', exerciseSchema);
