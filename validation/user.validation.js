import Joi from 'joi';

export const userValidationSchema = Joi.object({
    username: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().min(10).required(),
    address: Joi.object({
        country: Joi.string().required(),
        city: Joi.string().required(),
        street: Joi.string().required(),
    }).required(),
    age: Joi.number().min(0).max(120).required(),
    parentOrChild: Joi.string().valid('הורה', 'ילד').required(),
    favoriteHobbies: Joi.array().items(
        Joi.string().valid('אומנות ומוזיקה', 'פעילויות', 'צפיה בסרטים', 'קריאת ספרים')
    ).required(),
    gender: Joi.string().valid('male', 'female').required(),
    role: Joi.string().valid('admin', 'teacher', 'user').optional(),
    level: Joi.number().optional()
});