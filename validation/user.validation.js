import Joi from 'joi';

export const userValidationSchema = Joi.object({
username: Joi.string().trim().required(),
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().required(), // שונה ל-required בהתאם למודל
    age: Joi.number().min(4).max(120).required(), // התאמה לטווח ולחובה במודל
    
    // התאמה מלאה לאנגלית (תיקון הבאג מה-Postman)
    parentOrChild: Joi.string().valid('parent', 'child').required(),
    
    // התאמה לערכים באנגלית של המודל
    favoriteHobbies: Joi.array().items(
        Joi.string().valid('art_music', 'sports', 'movies', 'books')
    ).required(),
    
    // הוספת השדה החדש מהמודל
    expectations: Joi.array().items(
        Joi.string().valid('grammar', 'fluent_speaking', 'confidence', 'vocabulary')
    ).optional().default([]),
    
    gender: Joi.string().valid('male', 'female').required(),
    role: Joi.string().valid('admin', 'teacher', 'user').optional().default('user'),
    englishLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').optional().default('beginner')
});