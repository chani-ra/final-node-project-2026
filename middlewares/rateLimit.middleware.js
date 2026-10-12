import { rateLimit } from "express-rate-limit";

const jsonRateLimitHandler = (message) => (req, res) => {
  return res.status(429).json({
    success: false,
    message,
  });
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: jsonRateLimitHandler(
    "יותר מדי ניסיונות התחברות. נסי שוב בעוד מספר דקות"
  ),
});

export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: jsonRateLimitHandler(
    "יותר מדי ניסיונות הרשמה. נסי שוב מאוחר יותר"
  ),
});

export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: jsonRateLimitHandler(
    "בוצעו יותר מדי בקשות AI בזמן קצר. נסי שוב בעוד מספר דקות"
  ),
});