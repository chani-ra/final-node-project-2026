import { Schema, model } from 'mongoose';

const lessonSchema = new Schema(
  {
    // אחראי על ההקלטה
    instructorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // מידע בסיסי של השיעור
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
    },
    
    // קובץ הווידאו
    videoUrl: {
      type: String,
      required: [true, 'קובץ ווידאו הוא חובה'],
    },
    
    // מידע על הקובץ
    videoFileName: String,
    videoFileSize: Number, // בבייטים
    videoDuration: Number, // בשניות
    
    // סטטוס העיבוד
    uploadStatus: {
      type: String,
      enum: ['uploading', 'processing', 'completed', 'failed'],
      default: 'uploading',
    },
    
    // גישה לשיעור
    isPublic: {
      type: Boolean,
      default: false,
    },
    
    enrolledStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    
    // מטא-דאטה
    tags: [String],
    language: {
      type: String,
      default: 'he',
      enum: ['he', 'en'],
    },
    
    // סטטיסטיקות
    views: {
      type: Number,
      default: 0,
    },
    
    createdAt: {
      type: Date,
      default: Date.now,
    },
    
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// אינדקס לחיפושים מהירים
lessonSchema.index({ instructorId: 1, createdAt: -1 });
lessonSchema.index({ title: 'text', description: 'text' });

module.exports = model('Lesson', lessonSchema);