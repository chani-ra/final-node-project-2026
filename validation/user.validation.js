import Joi from 'joi';

export const userValidationSchema = Joi.object({
    username: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().optional(),
    address: Joi.object({
        country: Joi.string().optional(),
        city: Joi.string().optional(),
        street: Joi.string().optional(),
    }).optional(),
    age: Joi.number().min(0).max(120).optional(),
    parentOrChild: Joi.string().valid('הורה', 'ילד').optional(),
    favoriteHobbies: Joi.array().items(
        Joi.string().valid('אומנות ומוזיקה', 'פעילויות', 'צפיה בסרטים', 'קריאת ספרים')
    ).optional().default([]),
    gender: Joi.string().valid('male', 'female').optional(),
    role: Joi.string().valid('admin', 'teacher', 'user').optional(),
    level: Joi.number().optional()
});