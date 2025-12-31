import { Schema, model } from "mongoose";

const userSchema = new Schema({
    username: String,
    email: { type: String, unique: true },
    password: String,
    phone: String,
    address: {
     
            country: String,
            city: String,
            street: String,
      
    },
    age: {
        type: Number,
        required: true,
        min: 0,
        max: 120,
    },
    parentOrChild: {
        type: String,
        enum: ['הורה', 'ילד'],
        required: true,
    },
    favoriteHobbies: {
        type: [String],
        required: true,
        enum: ['אומנות ומוזיקה', 'פעילויות', 'צפיה בסרטים', 'קריאת ספרים']
    },    gender: { type: String, enum: ['male', 'female'], required: true },
    role: { type: String, enum: ['admin', 'teacher', 'user'] },
//     level: { type: Number },
    
//     // קורסים שהמשתמש רשום אליהם (לתלמידים)
//     enrolledCourses: [{ 
//         type: Schema.Types.ObjectId, 
//         ref: 'Course' 
//     }],
    
//     // התקדמות בקורסים
//     courseProgress: [{
//         course: { type: Schema.Types.ObjectId, ref: 'Course' },
//         completedLessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
//         currentLesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
//         enrolledAt: { type: Date, default: Date.now },
//         completedAt: Date,
//         progress: { type: Number, min: 0, max: 100, default: 0 }
//     }]
// }, {
//     timestamps: true
});

export default model('user', userSchema);