import { Schema, model } from "mongoose";

const lessonSchema = new Schema(
  {
    instructorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    title: {
      type: String,
      required: [true, 'כותרת שיעור היא חובה'],
      trim: true,
      maxlength: [200, 'כותרת לא יכולה להיות יותר מ-200 תווים'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'תיאור לא יכול להיות יותר מ-2000 תווים'],
      default: '',
    },

    videoUrl: {
      type: String,
      required: [true, 'קובץ ווידאו הוא חובה'],
    },

    videoFileName: {
      type: String,
      required: true,
    },

    videoFileSize: {
      type: Number, // בבייטים
      required: true,
    },

    uploadStatus: {
      type: String,
      enum: ['uploading', 'processing', 'completed', 'failed'],
      default: 'completed',
    },

    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },

    enrolledStudents: [
      {
      type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    tags: {
      type: [String],
      default: [],
    },

    language: {
      type: String,
      enum: ['he', 'en'],
      default: 'he',
    },

    views: {
      type: Number,
      default: 0,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes לביצועים
lessonSchema.index({ instructorId: 1, createdAt: -1 });
lessonSchema.index({ title: 'text', description: 'text' });
lessonSchema.index({ isPublic: 1, createdAt: -1 });

export default model('Lesson', lessonSchema);