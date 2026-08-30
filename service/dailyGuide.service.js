import DailyGuide from "../models/dailyGuide.model.js";

import { generateDailyGuide } from "../agents/dailyGuide.agent.js";

export function getIsraelDateKey(
  date = new Date()
) {
  const parts =
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);

  const dateParts = Object.fromEntries(
    parts.map((part) => [
      part.type,
      part.value,
    ])
  );

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

export async function getOrCreateDailyGuide(
  userId
) {
  const dateKey = getIsraelDateKey();

  const existingGuide =
    await DailyGuide.findOne({
      user: userId,
      dateKey,
    }).lean();

  if (existingGuide) {
    return {
      guide: existingGuide,
      fromCache: true,
    };
  }

  const generatedGuide =
    await generateDailyGuide(userId);

  try {
    const createdGuide =
      await DailyGuide.create({
        user: userId,
        dateKey,

        focus: generatedGuide.focus,
        reason: generatedGuide.reason,
        steps: generatedGuide.steps,
        tip: generatedGuide.tip,

        encouragement:
          generatedGuide.encouragement,

        estimatedMinutes:
          generatedGuide.estimatedMinutes,

        toolsUsed:
          generatedGuide.toolsUsed || [],

        isFallback:
          generatedGuide.isFallback ||
          false,
      });

    return {
      guide: createdGuide.toObject(),
      fromCache: false,
    };
  } catch (error) {
    if (error?.code === 11000) {
      const existingGuideAfterRace =
        await DailyGuide.findOne({
          user: userId,
          dateKey,
        }).lean();

      if (existingGuideAfterRace) {
        return {
          guide:
            existingGuideAfterRace,
          fromCache: true,
        };
      }
    }

    throw error;
  }
}