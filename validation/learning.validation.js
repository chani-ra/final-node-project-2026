import Joi from "joi";

const objectId = Joi.string().pattern(/^[a-f0-9]{24}$/i);

export const learningPromptSchema = Joi.object({
  categoryId: objectId.required(),
  subcategoryId: objectId.required(),
  prompt: Joi.string().trim().min(5).max(800).required(),
  provider: Joi.string().valid("gemini", "openai").default("gemini"),
}).required();

export const adminHistoryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  userId: objectId.optional(),
  categoryId: objectId.optional(),
}).unknown(false);

export const historyQuerySchema = adminHistoryQuerySchema.fork(
  ["userId"], (field) => field.forbidden()
);
