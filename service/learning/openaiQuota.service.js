import { randomUUID } from "node:crypto";
import LearningDailyQuota from "../../models/learningDailyQuota.model.js";

// The API key is shared. Defaults deliberately allow only a small daily demo budget.
// Override using OPENAI_LESSONS_DAILY_TOTAL and OPENAI_LESSONS_DAILY_PER_USER.
function safeLimit(value, fallback) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 1000 ? parsed : fallback;
}

function quotaError() {
  const error = new Error("מכסת שיעורי OpenAI היומית הושלמה. נסי שוב מחר או בחרי Gemini");
  error.statusCode = 429;
  return error;
}

/** Atomically reserve a daily OpenAI generation slot before contacting the paid API. */
export async function reserveOpenAILesson({
  userId,
  now = new Date(),
  globalLimit = safeLimit(process.env.OPENAI_LESSONS_DAILY_TOTAL, 20),
  perUserLimit = safeLimit(process.env.OPENAI_LESSONS_DAILY_PER_USER, 3),
}) {
  const id = String(userId);
  if (!/^[a-f0-9]{24}$/i.test(id)) {
    const error = new Error("משתמש לא תקין");
    error.statusCode = 400;
    throw error;
  }
  if (globalLimit <= 0 || perUserLimit <= 0) throw quotaError();

  const day = now.toISOString().slice(0, 10); // UTC and persistent across Render restarts
  const claimId = randomUUID();
  const previousUserCount = { $ifNull: [`$users.${id}`, 0] };
  const previousTotal = { $ifNull: ["$total", 0] };
  const canClaim = {
    $and: [
      { $lt: [previousTotal, globalLimit] },
      { $lt: [previousUserCount, perUserLimit] },
    ],
  };
  const entry = await LearningDailyQuota.findOneAndUpdate(
    { _id: `openai:${day}` },
    [{
      $set: {
        createdAt: { $ifNull: ["$createdAt", now] },
        total: { $cond: [canClaim, { $add: [previousTotal, 1] }, previousTotal] },
        [`users.${id}`]: { $cond: [canClaim, { $add: [previousUserCount, 1] }, previousUserCount] },
        lastClaim: { $cond: [canClaim, claimId, "$lastClaim"] },
      },
    }],
    { upsert: true, new: true, lean: true }
  );

  if (entry?.lastClaim !== claimId) throw quotaError();
  // A failed model call still consumes a slot: it might have incurred API charges.
}
