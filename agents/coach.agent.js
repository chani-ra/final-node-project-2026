import { GoogleGenAI } from "@google/genai";

import { coachPlanSchema } from "../schemas/ai.schemas.js";

import {
  aiCoachToolDeclarations,
  aiCoachToolHandlers,
} from "../tools/aiCoach.tools.js";

import { runAgentTools } from "./agentRunner.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

function getCoachFallbackPlan() {
  return {
    focus: "תרגול קצר להיום",

    summary:
      "כרגע לא ניתן לבצע ניתוח AI מלא, לכן מוצגת תוכנית גיבוי קצרה.",

    steps: [
      "בחרי 5 מילים חדשות מתוך שיעור, שיר או קטע קצר.",
      "כתבי ליד כל מילה פירוש קצר בעברית.",
      "כתבי משפט אחד באנגלית עם אחת מהמילים.",
    ],

    tip:
      "נסי שוב בעוד כמה דקות לקבלת תוכנית מותאמת אישית מה־AI.",

    encouragement:
      "גם תרגול קצר בלי AI מקדם אותך. העיקר להמשיך בצעד קטן וברור.",

    estimatedMinutes: 15,
  };
}

function isAIUnavailableError(error) {
  const message =
    error?.message?.toLowerCase() || "";

  const causeMessage =
    error?.cause?.message?.toLowerCase() || "";

  const causeCode = error?.cause?.code;

  return (
    error?.status === 429 ||
    error?.code === 429 ||
    message.includes("429") ||
    message.includes("quota") ||
    message.includes(
      "too many requests"
    ) ||
    message.includes("fetch failed") ||
    causeMessage.includes(
      "connect timeout"
    ) ||
    causeCode ===
      "UND_ERR_CONNECT_TIMEOUT"
  );
}

function parseCoachPlan(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error(
      "❌ Failed to parse Coach JSON:",
      text
    );

    return null;
  }
}

export async function generateCoachAgentPlan({
  userId,
  note,
  userProfile,
}) {
  const prompt = `
You are an expert English learning coach for Hebrew-speaking students.

Create a short, practical, personalized study plan for today.

Today's student request - HIGHEST PRIORITY:
${JSON.stringify(note)}

Student profile and previous learning context:
${JSON.stringify(userProfile, null, 2)}

Important rules:
1. The student's current request is the highest priority.
2. Previous coach history is only secondary context.
3. Do not repeat a previous plan topic unless today's request or current learning data supports it.
4. If today's request is different from previous plans, follow today's request.
5. Use the student's level, hobbies and goals only to personalize the plan.
6. Use student-data tools when their information can materially improve the plan.
7. You may use more than one relevant tool.
8. Do not use the same tool more than once.
9. Use at most 3 tool calls.
10. The response must be in Hebrew.
11. Create exactly 3 short and concrete steps.
12. Keep the plan realistic and useful for today.
`;

  try {
    const {
      agentContents,
      toolsUsed,
    } = await runAgentTools({
      ai,

      model: "gemini-2.5-flash",

      prompt,

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
Now create the final personalized study plan.

Use all relevant information retrieved from the tools.

Do not request any more tools.

Return the final plan in Hebrew according to the required schema.
`,
          },
        ],
      },
    ];

    const response =
      await ai.models.generateContent({
        model: "gemini-2.5-flash",

        contents: finalContents,

        config: {
          responseMimeType:
            "application/json",

          responseSchema:
            coachPlanSchema,
        },
      });

    const plan = parseCoachPlan(
      response.text
    );

    if (!plan) {
      return {
        plan: getCoachFallbackPlan(),
        toolsUsed,
        fallback: true,
        reason: "parse_error",
      };
    }

    return {
      plan,
      toolsUsed,
      fallback: false,
      reason: null,
    };
  } catch (error) {
    console.error(
      "❌ Coach Agent error:",
      error.message || error
    );

    if (isAIUnavailableError(error)) {
      return {
        plan: getCoachFallbackPlan(),
        toolsUsed: [],
        fallback: true,
        reason: "ai_unavailable",
      };
    }

    throw error;
  }
}