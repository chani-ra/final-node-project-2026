import { GoogleGenAI } from "@google/genai";

import User from "../models/users.model.js";

import { dailyGuideSchema } from "../schemas/ai.schemas.js";

import {
  aiCoachToolDeclarations,
  aiCoachToolHandlers,
} from "../tools/aiCoach.tools.js";

import { runAgentTools } from "./agentRunner.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

function parseAIJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error(
      "❌ Failed to parse Daily Guide JSON:",
      text
    );

    return null;
  }
}

function isRateLimitError(error) {
  return (
    error?.status === 429 ||
    error?.code === 429 ||
    error?.message?.includes("429") ||
    error?.message
      ?.toLowerCase()
      .includes("too many requests") ||
    error?.message
      ?.toLowerCase()
      .includes("quota")
  );
}

function getDailyGuideFallback() {
  return {
    focus: "שמירה על רצף הלמידה",

    reason:
      "כרגע לא ניתן לבצע ניתוח AI מלא, לכן נבנה עבורך מסלול קצר ובטוח להמשך תרגול.",

    steps: [
      {
        title: "חזרה על מילים",
        description:
          "חזרי על כמה מילים שכבר למדת וחזקי את הזיכרון שלהן.",
        action: "OPEN_DICTIONARY",
        estimatedMinutes: 5,
      },

      {
        title: "תרגול כתיבה קצר",
        description:
          "כתבי כמה משפטים קצרים באנגלית כדי לשמור על רצף התרגול.",
        action: "OPEN_WRITING",
        estimatedMinutes: 10,
      },

      {
        title: "המשך למידה",
        description:
          "המשיכי בפעילות הבאה באחד הקורסים שלך.",
        action: "OPEN_COURSES",
        estimatedMinutes: 10,
      },
    ],

    tip:
      "גם תרגול קצר ועקבי עוזר לשמור על התקדמות.",

    encouragement:
      "העיקר להמשיך ברצף ולהתקדם צעד אחד בכל פעם.",

    estimatedMinutes: 25,

    toolsUsed: [],

    isFallback: true,
  };
}

export async function generateDailyGuide(
  userId
) {
  const user = await User.findById(userId)
    .select(
      "username englishLevel favoriteHobbies expectations"
    )
    .lean();

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  const userProfile = {
    username: user.username || "תלמידה",

    englishLevel:
      user.englishLevel || "beginner",

    favoriteHobbies:
      user.favoriteHobbies || [],

    expectations:
      user.expectations || [],
  };

  const agentPrompt = `
You are a proactive Daily English Learning Guide.

Your job is to decide what this student should focus on TODAY.

The student should not need to know what their weakness is
or tell you what they should study.

Student profile:
${JSON.stringify(userProfile, null, 2)}

You have access to student learning tools.

Use tools only when their data can materially improve today's plan.

Available tools may include information about:
- course learning progress
- quiz performance
- grammar and writing mistakes
- other student learning data that may be added in the future

Important rules:
- Analyze the student's real learning data.
- Decide the learning priority proactively.
- You may use more than one tool.
- Do not use the same tool more than once.
- Use at most 3 tools.
- A result from one tool may influence whether another tool is needed.
- Do not ask the student what they want to study.
`;

  try {
    const {
      agentContents,
      toolsUsed,
    } = await runAgentTools({
      ai,

      model: "gemini-2.5-flash",

      prompt: agentPrompt,

      toolDeclarations:
        aiCoachToolDeclarations,

      toolHandlers:
        aiCoachToolHandlers,

      toolContext: userId,

      maxToolCalls: 3,
    });

    const finalContents = [
      ...agentContents,

      {
        role: "user",

        parts: [
          {
            text: `
Now create the final Daily Guide.

Use all relevant student information retrieved from the tools.

Requirements:
- Respond in Hebrew.
- Choose one clear learning focus for today.
- Explain briefly why this focus was chosen.
- Create exactly 3 practical steps.
- Each step must contain:
  title
  description
  action
  estimatedMinutes
- Use only action values allowed by the schema.
- Keep the plan realistic and useful for one day.
- Do not request any more tools.
`,
          },
        ],
      },
    ];

    const finalResponse =
      await ai.models.generateContent({
        model: "gemini-2.5-flash",

        contents: finalContents,

        config: {
          responseMimeType:
            "application/json",

          responseSchema:
            dailyGuideSchema,
        },
      });

    const guide = parseAIJson(
      finalResponse.text
    );

    if (!guide) {
      throw new Error(
        "Daily Guide returned invalid JSON"
      );
    }

    return {
      ...guide,
      toolsUsed,
      isFallback: false,
    };
  } catch (error) {
    if (isRateLimitError(error)) {
      console.warn(
        "⚠️ Daily Guide Gemini quota reached - using fallback"
      );

      return getDailyGuideFallback();
    }

    throw error;
  }
}