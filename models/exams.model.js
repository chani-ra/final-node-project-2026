import { Schema, model } from 'mongoose';

const questionSchema = new Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  answer: { type: String, required: true },
  type: {
    type: String,
    enum: ['multiple-choice', 'true-false', 'open'],
    default: 'multiple-choice',
  },
});

const examSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  questions: [questionSchema],
  duration: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default model('Exam', examSchema);