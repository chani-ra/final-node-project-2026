import Joi from 'joi';

export const userValidationSchema = Joi.object({
  username: Joi.string()
    .trim()
    .min(2)
    .max(80)
    .required()
    .messages({
      'string.empty': 'שם משתמש חובה',
      'string.min': 'שם משתמש חייב להכיל לפחות 2 תווים',
      'any.required': 'שם משתמש חובה',
    }),

  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'כתובת אימייל לא תקינה',
      'any.required': 'אימייל חובה',
    }),

  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'סיסמה חייבת להכיל לפחות 6 תווים',
      'any.required': 'סיסמה חובה',
    }),

  phone: Joi.string()
    .trim()
    .required()
    .messages({
      'any.required': 'מספר טלפון חובה',
      'string.empty': 'מספר טלפון חובה',
    }),

  age: Joi.number()
    .min(4)
    .max(120)
    .required()
    .messages({
      'number.min': 'גיל מינימלי הוא 4',
      'number.max': 'גיל מקסימלי הוא 120',
      'any.required': 'גיל חובה',
    }),

  parentOrChild: Joi.string()
    .valid('parent', 'child')
    .required()
    .messages({
      'any.only': 'יש לבחור parent או child',
      'any.required': 'יש לבחור האם מדובר בילד או הורה',
    }),

  favoriteHobbies: Joi.array()
    .items(
      Joi.string().valid('art_music', 'sports', 'movies', 'books')
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'יש לבחור לפחות תחביב אחד',
      'any.required': 'יש לבחור תחביבים',
    }),

  expectations: Joi.array()
    .items(
      Joi.string().valid('grammar', 'fluent_speaking', 'confidence', 'vocabulary')
    )
    .default([]),

  gender: Joi.string()
    .valid('male', 'female')
    .required()
    .messages({
      'any.only': 'יש לבחור male או female',
      'any.required': 'יש לבחור מגדר',
    }),

  role: Joi.string()
    .valid('admin', 'teacher', 'student')
    .optional()
    .default('student'),

  englishLevel: Joi.string()
    .valid('beginner', 'intermediate', 'advanced')
    .optional()
    .default('beginner'),
});