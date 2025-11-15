import { required } from "joi";
import { Schema, model } from "mongoose";

const userSchema = new Schema({
    username: String,
    email: { type: String, unique: true },
    password: String,
    phone: String,
    address: {
        type: {
            country: String,
            city: String,
            street: String,
        },
        required: true
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
    },
    gender: { type: String, enum: ['male', 'female'], required: true },
    role: { type: String, enum: ['admin', 'teacher', 'user'] },
    level: { type: Number, }

});

export default model('user', userSchema);