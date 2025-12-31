import { Schema, model } from 'mongoose';

const courseSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        required: true
    },
    category: {
        type: String,
        enum: ['grammar', 'vocabulary', 'songs', 'conversation', 'reading'],
        required: true
    },
    // המורה שיצר את הקורס
    teacher: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // תוכן הקורס - פשוט!
    content: {
        // מילים חדשות
        vocabulary: [{
            english: String,
            hebrew: String,
            example: String
        }],
        // תרגילים
        exercises: [{
            question: String,
            options: [String],
            correctAnswer: Number
        }],
        // שירים (אם יש)
        songs: [{
            type: Schema.Types.ObjectId,
            ref: 'song'
        }]
    },
    
    // מידע בסיסי על הקורס
    targetAudience: {
        type: String,
        enum: ['ילדים', 'מבוגרים', 'כולם'],
        default: 'כולם'
    },
    
    // סטטוסים
    isActive: {
        type: Boolean,
        default: true
    },
    
    // סטטיסטיקות בסיסיות
    stats: {
        enrolledStudents: { type: Number, default: 0 },
        averageRating: { type: Number, min: 0, max: 5, default: 0 }
    }
}, {
    timestamps: true
});

// Index בסיסי
courseSchema.index({ level: 1, category: 1 });
courseSchema.index({ teacher: 1 });
courseSchema.index({ targetAudience: 1 });

// Method פשוט למציאת קורסים מתאימים
courseSchema.statics.findForUser = function(user) {
    const query = { isActive: true };
    
    // סינון פשוט לפי גיל
    if (user.parentOrChild === 'ילד') {
        query.targetAudience = { $in: ['ילדים', 'כולם'] };
    }
    
    return this.find(query).populate('teacher', 'username');
};

export default model('Course', courseSchema);
