import Joi from "joi";

export const createReviewValidationSchema = Joi.object({
  text: Joi.string()
    .trim()
    .min(10)
    .max(700)
    .required()
    .messages({
      "string.empty": "יש לכתוב המלצה",
      "string.min": "המלצה חייבת להכיל לפחות 10 תווים",
      "string.max": "המלצה לא יכולה להיות יותר מ-700 תווים",
      "any.required": "יש לכתוב המלצה",
    }),

  rating: Joi.number()
    .min(1)
    .max(5)
    .default(5)
    .messages({
      "number.min": "דירוג חייב להיות לפחות 1",
      "number.max": "דירוג לא יכול להיות יותר מ-5",
    }),
});