import { Schema, model } from 'mongoose';

const quizSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    englishLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      required: true
    },
    quizType: {
      type: String,
      enum: ['grammar', 'vocabulary', 'reading', 'listening', 'writing', 'mixed'],
      required: true
    },
    questions: [
      {
        question: { type: String, required: true },
        questionType: {
          type: String,
          enum: ['multiple-choice', 'true-false', 'fill-blank', 'short-answer'],
          default: 'multiple-choice'
        },
        options: [{ type: String }], // רלוונטי רק ל-multiple-choice
        correctAnswer: { type: String, required: true },
        explanation: { type: String, default: '' }, // הסבר לתשובה נכונה
        points: { type: Number, default: 1 },
        difficulty: {
          type: String,
          enum: ['easy', 'medium', 'hard'],
          default: 'medium'
        }
      },
    ],
    totalPoints: { type: Number, default: 0 },
    passingScore: { type: Number, required: true, min: 0, max: 100 }, // אחוז הצלחה נדרש
    duration: { type: Number, required: true }, // בדקות
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// חישוב נקודות כולל לפני שמירה
quizSchema.pre('save', function(next) {
  this.totalPoints = this.questions.reduce((sum, q) => sum + (q.points || 1), 0);
  next();
});

export default model('Quiz', quizSchema);
