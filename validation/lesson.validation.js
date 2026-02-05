import Joi from 'joi';

export const lessonValidationSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(5)
    .max(200)
    .required()
    .messages({
      'string.empty': 'כותרת לא יכולה להיות ריקה',
      'string.min': 'כותרת חייבת להיות לפחות 5 תווים',
      'string.max': 'כותרת לא יכולה להיות יותר מ-200 תווים',
      'any.required': 'כותרת היא חובה',
    }),

  description: Joi.string()
    .trim()
    .max(2000)
    .optional()
    .default('')
    .messages({
      'string.max': 'תיאור לא יכול להיות יותר מ-2000 תווים',
    }),

  language: Joi.string()
    .valid('he', 'en')
    .default('he')
    .optional()
    .messages({
      'any.only': 'שפה חייבת להיות עברית (he) או אנגלית (en)',
    }),

  isPublic: Joi.boolean()
    .default(false)
    .optional()
    .messages({
      'boolean.base': 'isPublic חייב להיות boolean',
    }),
});