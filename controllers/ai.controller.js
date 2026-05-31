import { GoogleGenAI } from "@google/genai";
import User from "../models/users.model.js";

// חיבור ל-Gemini באמצעות מפתח ה-API מהסביבה
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ניסיון בטוח לפענח JSON מה-AI
const parseAIJson = (text, fallbackValue) => {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("❌ Failed to parse AI JSON:", text);
    return fallbackValue;
  }
};

// בדיקה האם השגיאה היא עומס / חריגה ממכסת Gemini
const isRateLimitError = (error) => {
  return (
    error?.status === 429 ||
    error?.code === 429 ||
    error?.message?.includes("429") ||
    error?.message?.toLowerCase().includes("too many requests") ||
    error?.message?.toLowerCase().includes("quota")
  );
};

// בדיקה קצרה אם ההודעה קשורה ללימוד אנגלית
const isEnglishLearningRequest = (message = "") => {
  const text = message.toLowerCase();

  const hasEnglishText = /[a-zA-Z]/.test(text);

  const learningPattern =
    /(אנגלית|דקדוק|תרגום|תרגם|מילה|מילים|משפט|ביטוי|שיחה|דיבור|הגייה|כתיבה|קריאה|שמיעה|ללמוד|לתרגל|תסביר|הסבר|תקן|עבר|הווה|עתיד|זמן|זמנים|פועל|english|grammar|vocabulary|sentence|word|translate|conversation|practice|correct|meaning|pronunciation|tense|verb|past|present|future|perfect|simple)/i;

  return hasEnglishText || learningPattern.test(text);
};

// תוכנית גיבוי למאמן האישי כש-Gemini לא זמין
const getCoachFallbackPlan = () => {
  return {
    focus: "תרגול קצר להיום",
    summary:
      "כרגע ה־AI עמוס או שהגענו למגבלת שימוש זמנית, לכן מוצגת תוכנית גיבוי חכמה.",
    steps: [
      "בחרי 5 מילים חדשות מתוך שיעור, שיר או קטע קצר.",
      "כתבי ליד כל מילה פירוש קצר בעברית.",
      "כתבי משפט אחד באנגלית עם אחת מהמילים.",
    ],
    tip: "נסי שוב בעוד כמה דקות לקבלת תוכנית מותאמת אישית מה־AI.",
    encouragement:
      "גם תרגול קצר בלי AI מקדם אותך. העיקר להמשיך בצעד קטן וברור.",
    estimatedMinutes: 15,
  };
};

// תשובת גיבוי לצ׳אט כש-Gemini לא זמין
const getConversationFallbackReply = () => {
  return (
    "כרגע יש עומס או מגבלת שימוש זמנית בחיבור ל־AI.\n" +
    "בינתיים אפשר לתרגל כך:\n" +
    "1. כתבי משפט אחד באנגלית.\n" +
    "2. נסי לתרגם אותו לעברית.\n" +
    "3. בעוד כמה דקות נסי לשלוח לי אותו שוב ואעזור לך לתקן."
  );
};

// מבנה גיבוי קבוע לתרגיל AI
const getExerciseFallback = () => {
  return {
    title: "Vocabulary Practice",
    description: "A short vocabulary exercise.",
    instructions: "השלימי את המשפט בעזרת המילה המתאימה.",
    questions: [
      {
        number: 1,
        sentence: "I want to learn a new ___ today.",
        options: ["word", "song", "lesson", "question"],
        correctAnswer: "word",
        hint: "בחרי מילה שמתאימה לתרגול אוצר מילים.",
      },
    ],
  };
};

// מבנה גיבוי קבוע לבדיקת כתיבה
const getEssayFallback = (reason = "unavailable") => {
  const messages = {
    rate_limit:
      "כרגע ה־AI עמוס או שהגענו למגבלת שימוש זמנית. נסי שוב בעוד כמה דקות. בינתיים כדאי לבדוק שהמשפטים מתחילים באות גדולה, שיש נקודה בסוף משפט, ושהפועל מתאים לנושא.",
    ai_unavailable:
      "כרגע בדיקת הכתיבה אינה זמינה. נסי שוב בעוד רגע. בינתיים כדאי לקרוא את הפסקה בקול ולבדוק אם כל משפט ברור ושלם.",
    server_error:
      "אירעה תקלה זמנית בבדיקת הכתיבה, ולכן לא ניתן ציון מדויק כרגע. הכיוון הכללי טוב, ונסי לשלוח שוב בעוד רגע כדי לקבל בדיקה מפורטת.",
    parse_error: "לא הצלחנו לנתח את תשובת ה־AI כרגע.",
  };

  return {
    score: 85,
    generalFeedback: messages[reason] || messages.ai_unavailable,
    grammarCorrections: [],
  };
};

const normalizeBrainMapSkills = (skills = []) => {
  if (!Array.isArray(skills)) return [];

  const allowedKeys = [
    "vocabulary",
    "grammar",
    "writing",
    "speaking",
    "listening",
    "confidence",
  ];

  return skills
    .filter((skill) => skill && allowedKeys.includes(skill.key))
    .map((skill) => ({
      key: skill.key,
      label: skill.label || getBrainSkillLabel(skill.key),
      score: Math.max(0, Math.min(100, Math.round(Number(skill.score) || 0))),
      reason: skill.reason || "הציון מבוסס על נתוני הפעילות במערכת.",
    }));
};

const getBrainSkillLabel = (key) => {
  const labels = {
    vocabulary: "אוצר מילים",
    grammar: "דקדוק",
    writing: "כתיבה",
    speaking: "דיבור",
    listening: "שמיעה",
    confidence: "ביטחון",
  };

  return labels[key] || key;
};

export const AiController = {
  // תיקון דקדוק + שמירה ל-DB
  correctGrammar: async (req, res, next) => {
    try {
      const { text } = req.body;
      const userId = req.user.id;

      if (!text || !text.trim()) {
        return res.status(400).json({
          success: false,
          message: "Text is required",
        });
      }

      const cleanText = text.trim();

      const prompt = `
You are an English teacher for Hebrew speakers.
Correct the grammar and spelling.

Student text:
${JSON.stringify(cleanText)}

Return strictly valid JSON only, no markdown.

Return this exact structure:
{
  "original": "original text",
  "corrected": "corrected text",
  "explanation": "הסבר בעברית"
}
`;

      let response;

      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });
      } catch (aiError) {
        if (isRateLimitError(aiError)) {
          return res.status(200).json({
            success: true,
            data: {
              original: cleanText,
              corrected: cleanText,
              explanation:
                "כרגע ה־AI עמוס או שהגענו למגבלת שימוש זמנית. נסי שוב בעוד כמה דקות.",
            },
          });
        }

        throw aiError;
      }

      const aiResult = parseAIJson(response.text, {
        original: cleanText,
        corrected: cleanText,
        explanation: "לא הצלחנו לנתח את תשובת ה-AI.",
      });

      await User.findByIdAndUpdate(
        userId,
        {
          $push: { grammarHistory: aiResult },
        },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        data: aiResult,
      });
    } catch (error) {
      next(error);
    }
  },

  // תרגום טקסט
  translateText: async (req, res, next) => {
    try {
      const { text, targetLang = "Hebrew" } = req.body;

      if (!text || !text.trim()) {
        return res.status(400).json({
          success: false,
          message: "Text is required",
        });
      }

      const cleanText = text.trim();

      let response;

      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Translate the following text into ${targetLang}. Return ONLY the translated text.\nText: ${JSON.stringify(cleanText)}`,
        });
      } catch (aiError) {
        if (isRateLimitError(aiError)) {
          return res.status(200).json({
            success: true,
            translation:
              "כרגע ה־AI עמוס או שהגענו למגבלת שימוש זמנית. נסי שוב בעוד כמה דקות.",
          });
        }

        throw aiError;
      }

      return res.status(200).json({
        success: true,
        translation: response.text.trim(),
      });
    } catch (error) {
      next(error);
    }
  },

  // עוזר מילון אישי: תיקון כתיב, תרגום, הסבר ודוגמה
  dictionaryHelper: async (req, res, next) => {
    try {
      const { text } = req.body;

      if (!text || !text.trim()) {
        return res.status(400).json({
          success: false,
          message: "נא להזין מילה או ביטוי באנגלית",
        });
      }

      const cleanText = text.trim();

      const prompt = `
You are an English dictionary helper for Hebrew-speaking students.

The student entered this English word or phrase:
${JSON.stringify(cleanText)}

Your job:
1. If the spelling is wrong, correct it.
2. Translate it to Hebrew.
3. Give a short English definition.
4. Give one simple English example sentence.
5. Tell if you corrected the input.

Return strictly valid JSON only, no markdown.

Return this exact structure:
{
  "originalInput": "student original input",
  "correctedWord": "correct English word or phrase",
  "translation": "תרגום לעברית",
  "definition": "Short English definition",
  "example": "Simple English example sentence",
  "wasCorrected": true
}
`;

      let response;

      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });
      } catch (aiError) {
        if (isRateLimitError(aiError)) {
          return res.status(200).json({
            success: true,
            data: {
              originalInput: cleanText,
              correctedWord: cleanText,
              translation: "",
              definition: "ה־AI אינו זמין זמנית בגלל עומס או מגבלת שימוש.",
              example: "",
              wasCorrected: false,
            },
          });
        }

        throw aiError;
      }

      const result = parseAIJson(response.text, {
        originalInput: cleanText,
        correctedWord: cleanText,
        translation: "",
        definition: "",
        example: "",
        wasCorrected: false,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Dictionary helper error:", error.message || error);
      next(error);
    }
  },

  // תרגול שיחה באנגלית בלבד עם סינון נושא
  conversation: async (req, res, next) => {
    try {
      const { message, level } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: "Message is required",
        });
      }

      const cleanMessage = message.trim();

      if (!isEnglishLearningRequest(cleanMessage)) {
        return res.status(200).json({
          success: true,
          reply:
            "אני כאן כדי לעזור רק בלימוד אנגלית 😊\nאפשר לבקש ממני: לתרגל שיחה, לתקן משפט, להסביר מילה, ללמוד דקדוק, להבין זמנים באנגלית או לבנות משפטים.",
        });
      }

      const safeLevel = level || "beginner";

      const prompt = `
You are "Bolt AI", an English learning assistant for Hebrew-speaking students.

Your role:
- Help the student learn English.
- Explain English grammar clearly in Hebrew.
- Help with English vocabulary, expressions, translation, sentence building and conversation practice.
- Correct English sentences gently.
- If the student asks about English grammar topics such as Past Perfect, Present Simple, Past Simple, Present Perfect, Future, tenses, verbs, nouns, adjectives — explain them clearly.
- If the student asks for a deeper explanation, give a deeper explanation, but keep it organized and practical.
- Ask one short practice question at the end when useful.

Student level: ${safeLevel}

Student message:
${JSON.stringify(cleanMessage)}

Important rules:
1. Stay focused only on English learning.
2. If the student asks about something unrelated to English learning, politely redirect back to English practice.
3. Hebrew explanations are allowed and recommended.
4. English examples are important.
5. Keep the answer friendly, clear, and useful.
6. Do not answer general knowledge questions unless they are directly needed for learning English.
7. If the student asks about "עבר מושלם", explain Past Perfect.
8. If the student asks about "עבר פשוט", explain Past Simple.
9. If the student asks about "הווה פשוט", explain Present Simple.
10. If the student asks about "הווה מושלם", explain Present Perfect.
`;

      let response;

      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });
      } catch (aiError) {
        console.error("❌ Gemini conversation error:", aiError.message || aiError);

        if (isRateLimitError(aiError)) {
          return res.status(200).json({
            success: true,
            reply: getConversationFallbackReply(),
          });
        }

        return res.status(200).json({
          success: true,
          reply:
            "כרגע יש תקלה זמנית בחיבור ל־AI. נסי שוב בעוד רגע. בינתיים אפשר לכתוב לי משפט באנגלית לתרגול.",
        });
      }

      return res.status(200).json({
        success: true,
        reply:
          response.text?.trim() ||
          "אני כאן כדי לעזור לך לתרגל אנגלית. כתבי לי משפט או נושא באנגלית ונמשיך משם.",
      });
    } catch (error) {
      console.error("❌ Conversation controller error:", error.message || error);
      next(error);
    }
  },

  // יצירת תרגילים
  generateExercise: async (req, res, next) => {
    try {
      const { topic, level, exerciseType, prompt } = req.body;

      const finalTopic = topic || prompt || "English practice";
      const finalLevel = level || "intermediate";
      const finalType = exerciseType || "vocabulary";

      const aiPrompt = `
You are an English teacher for Hebrew-speaking students.

Create a ${finalType} exercise about "${finalTopic}" for ${finalLevel} level students.

Return strictly valid JSON only. Do not use markdown.

Return exactly this structure:
{
  "title": "Short attractive English title",
  "description": "One short sentence explaining the goal of the exercise",
  "instructions": "הוראות קצרות בעברית לתלמידה",
  "questions": [
    {
      "number": 1,
      "sentence": "English exercise sentence with a blank ___ if needed",
      "options": ["option 1", "option 2", "option 3", "option 4"],
      "correctAnswer": "the correct answer",
      "hint": "Short helpful hint in Hebrew"
    }
  ]
}

Rules:
1. Create exactly 5 questions.
2. Number the questions from 1 to 5.
3. Keep the English suitable for ${finalLevel} level.
4. Make the exercise clear, friendly and classroom-ready.
5. If the exercise type does not need options, return an empty options array.
6. The explanation and hints should be in Hebrew.
`;

      let response;

      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: aiPrompt,
          config: { responseMimeType: "application/json" },
        });
      } catch (aiError) {
        if (isRateLimitError(aiError)) {
          return res.status(200).json({
            success: true,
            data: getExerciseFallback(),
          });
        }

        throw aiError;
      }

      const data = parseAIJson(response.text, getExerciseFallback());

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  // בדיקת חיבור / כתיבה באנגלית
  checkEssay: async (req, res, next) => {
    try {
      const { text, studentLevel } = req.body;

      if (!text || !text.trim()) {
        return res.status(400).json({
          success: false,
          message: "Text is required",
        });
      }

      const cleanText = text.trim();

      const prompt = `
You are an English writing teacher for Hebrew-speaking students.

Check the student's English writing.

Student level: ${studentLevel || "intermediate"}

Student writing:
${JSON.stringify(cleanText)}

Return strictly valid JSON only, no markdown.

Return this exact structure:
{
  "score": 85,
  "generalFeedback": "משוב כללי בעברית, ברור ומעודד",
  "grammarCorrections": [
    {
      "mistake": "wrong sentence or phrase",
      "correction": "correct version",
      "type": "grammar | spelling | punctuation | capitalization | wording",
      "severity": "serious | minor",
      "affectsScore": true,
      "explanation": "הסבר קצר בעברית"
    }
  ]
}

Important:
- The feedback must be in Hebrew.
- Be kind, warm and encouraging.
- The goal is to motivate the student and help her improve.
- Judge the writing according to the student's level.
- Mention what the student did well before mentioning mistakes.

Scoring rules:
- Score should be between 0 and 100.
- The score should be educational and encouraging, not harsh.
- In most normal cases, give a score between 75 and 95.
- Serious grammar mistakes should lower the score.
- Repeated serious grammar mistakes should lower the score more.
- Minor spelling mistakes, missing letters, city names written incorrectly, punctuation mistakes, or capitalization mistakes should be mentioned gently but should not significantly lower the score.
- Do not lower the score for small spelling mistakes unless they make the sentence hard to understand.
- If the meaning is clear and the main grammar is good, keep the score encouraging.

Correction rules:
- If there are no serious mistakes, return an empty grammarCorrections array or include only minor notes.
- In each correction, explain whether it is a serious grammar mistake or a minor spelling/writing mistake.
- If the mistake is minor, say clearly in Hebrew that it is a small note and should not hurt the grade much.
`;

      let response;

      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });
      } catch (aiError) {
        console.error("❌ Gemini checkEssay error:", aiError.message || aiError);

        if (isRateLimitError(aiError)) {
          return res.status(200).json({
            success: true,
            fallback: true,
            reason: "rate_limit",
            data: getEssayFallback("rate_limit"),
          });
        }

        return res.status(200).json({
          success: true,
          fallback: true,
          reason: "ai_unavailable",
          data: getEssayFallback("ai_unavailable"),
        });
      }

      const data = parseAIJson(response.text, getEssayFallback("parse_error"));

      const safeScore =
        typeof data.score === "number" && data.score >= 0 && data.score <= 100
          ? data.score
          : Number(data.score) >= 0 && Number(data.score) <= 100
          ? Number(data.score)
          : 85;

      return res.status(200).json({
        success: true,
        data: {
          score: safeScore,
          generalFeedback:
            data.generalFeedback ||
            "בדקתי את הכתיבה שלך. יש כמה נקודות לשיפור, אבל הכיוון טוב.",
          grammarCorrections: Array.isArray(data.grammarCorrections)
            ? data.grammarCorrections
            : [],
        },
      });
    } catch (error) {
      console.error("❌ checkEssay controller error:", error.message || error);

      return res.status(200).json({
        success: true,
        fallback: true,
        reason: "server_error",
        data: getEssayFallback("server_error"),
      });
    }
  },

 // יצירת בחן אמריקאי
generateQuiz: async (req, res, next) => {
  try {
    const { topic, difficulty, questionCount } = req.body;

    const finalTopic = topic || "English";
    const finalDifficulty = difficulty || "intermediate";
    const finalQuestionCount = questionCount || 5;

    const prompt = `
You are an English teacher for Hebrew-speaking students.

Create a multiple-choice quiz about "${finalTopic}" for ${finalDifficulty} level students.

Generate exactly ${finalQuestionCount} questions.

Return strictly valid JSON only. Do not use markdown.

Return exactly this structure:
[
  {
    "number": 1,
    "question": "Question text in English",
    "options": ["option 1", "option 2", "option 3", "option 4"],
    "correctAnswer": "The exact correct option",
    "explanation": "הסבר קצר בעברית למה זו התשובה הנכונה"
  }
]

Rules:
1. Each question must have exactly 4 options.
2. The correctAnswer must be exactly one of the options.
3. Questions should match the student's level.
4. Explanations must be in Hebrew.
5. Number the questions from 1 to ${finalQuestionCount}.
6. Keep the quiz focused on the topic: "${finalTopic}".
7. Make the wrong options reasonable but clearly incorrect.
`;

    let response;

    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });
    } catch (aiError) {
      if (isRateLimitError(aiError)) {
        return res.status(200).json({
          success: true,
          questions: [
            {
              number: 1,
              question: "What is the correct sentence?",
              options: [
                "She go to school.",
                "She goes to school.",
                "She going to school.",
                "She gone to school.",
              ],
              correctAnswer: "She goes to school.",
              explanation:
                "ב־Present Simple מוסיפים s לפועל כאשר הנושא הוא she, he או it.",
            },
          ],
        });
      }

      throw aiError;
    }

    const questions = parseAIJson(response.text, [
      {
        number: 1,
        question: "What is the correct sentence?",
        options: [
          "She go to school.",
          "She goes to school.",
          "She going to school.",
          "She gone to school.",
        ],
        correctAnswer: "She goes to school.",
        explanation:
          "ב־Present Simple מוסיפים s לפועל כאשר הנושא הוא she, he או it.",
      },
    ]);

    return res.status(200).json({
      success: true,
      questions,
    });
  } catch (error) {
    next(error);
  }
},

  // שמירת תוצאות בוחן
  saveQuizResult: async (req, res, next) => {
    try {
      const { topic, score, totalQuestions } = req.body;
      const userId = req.user.id;

      await User.findByIdAndUpdate(userId, {
        $push: {
          quizResults: {
            topic,
            score,
            totalQuestions,
            completedAt: new Date(),
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: "Quiz result saved!",
      });
    } catch (error) {
      next(error);
    }
  },

  // יצירת תוכנית למידה כללית
  generateLearningPlan: async (req, res, next) => {
    try {
      const prompt = `
Generate a 4-week study schedule.
Important: the text must be in Hebrew.
Add feedback and wishes at the end of the plan.

Return strictly valid JSON only, no markdown.
Return JSON array: [{"week": 1, "focus": "...", "tasks": ["..."]}].
`;

      let response;

      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });
      } catch (aiError) {
        if (isRateLimitError(aiError)) {
          return res.status(200).json({
            success: true,
            plan: [
              {
                week: 1,
                focus: "חיזוק בסיס באנגלית",
                tasks: [
                  "ללמוד 5 מילים חדשות ביום",
                  "לתרגל משפט אחד בכל יום",
                  "לקרוא קטע קצר באנגלית פעמיים בשבוע",
                ],
              },
            ],
          });
        }

        throw aiError;
      }

      const plan = parseAIJson(response.text, []);

      return res.status(200).json({
        success: true,
        plan,
      });
    } catch (error) {
      console.error("❌ AI Learning Plan Error:", error.message || error);
      next(error);
    }
  },

  // טיפים ללמידה
  getStudyTips: async (req, res, next) => {
    try {
      const { level, focusArea } = req.query;

      const prompt = `
Provide 3 study tips for level ${level || "intermediate"} in ${focusArea || "general"}.
Important: The explanation must be in Hebrew and in English.

Return strictly valid JSON only, no markdown.
Return JSON array of strings.
`;

      let response;

      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });
      } catch (aiError) {
        if (isRateLimitError(aiError)) {
          return res.status(200).json({
            success: true,
            tips: [
              "לתרגל מעט כל יום עדיף על עומס גדול פעם בשבוע.",
              "כדאי ללמוד מילים בתוך משפטים ולא לבד.",
              "קריאה בקול עוזרת מאוד לביטחון בדיבור.",
            ],
          });
        }

        throw aiError;
      }

      const tips = parseAIJson(response.text, []);

      return res.status(200).json({
        success: true,
        tips,
      });
    } catch (error) {
      next(error);
    }
  },

  // יצירת מפת יכולות חכמה לתלמידה
  generateBrainMap: async (req, res) => {
    try {
      const {
        level = "beginner",
        stats = {},
        localSkills = [],
        latestConversation = "",
      } = req.body;

      const prompt = `
You are an expert English learning analyst for Hebrew-speaking students.

Create a smart English skill map based on the student's activity.

Student level:
${level}

System stats:
${JSON.stringify(stats, null, 2)}

Local calculated skills:
${JSON.stringify(localSkills, null, 2)}

Latest conversation snippet:
${JSON.stringify(latestConversation)}

Return strictly valid JSON only. No markdown.

Return this exact structure:
{
  "summary": "סיכום קצר בעברית על מצב התלמידה",
  "strongestSkill": "Vocabulary",
  "weakestSkill": "Grammar",
  "recommendation": "המלצה קצרה בעברית מה כדאי לעשות עכשיו",
  "skills": [
    {
      "key": "vocabulary",
      "label": "אוצר מילים",
      "score": 72,
      "reason": "הסבר קצר בעברית"
    },
    {
      "key": "grammar",
      "label": "דקדוק",
      "score": 48,
      "reason": "הסבר קצר בעברית"
    },
    {
      "key": "writing",
      "label": "כתיבה",
      "score": 63,
      "reason": "הסבר קצר בעברית"
    },
    {
      "key": "speaking",
      "label": "דיבור",
      "score": 55,
      "reason": "הסבר קצר בעברית"
    },
    {
      "key": "listening",
      "label": "שמיעה",
      "score": 50,
      "reason": "הסבר קצר בעברית"
    },
    {
      "key": "confidence",
      "label": "ביטחון",
      "score": 58,
      "reason": "הסבר קצר בעברית"
    }
  ]
}

Rules:
- Score must be between 0 and 100.
- Keep Hebrew warm, clear and practical.
- Use the given stats.
- Do not invent impossible data.
- If there is not enough data, say that the map is an initial estimate.
`;

      let response;

      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });
      } catch (aiError) {
        console.error("❌ Brain Map AI error:", aiError.message || aiError);

        if (isRateLimitError(aiError)) {
          return res.status(200).json({
            success: true,
            fallback: true,
            reason: "rate_limit",
            brainMap: {
              summary:
                "כרגע ה־AI עמוס, לכן מוצגת מפת יכולות מקומית לפי הנתונים הקיימים.",
              strongestSkill: "",
              weakestSkill: "",
              recommendation:
                "אפשר להמשיך ללמוד כרגיל, ולנסות לשדרג את המפה עם AI בעוד כמה דקות.",
              skills: normalizeBrainMapSkills(localSkills),
            },
          });
        }

        return res.status(200).json({
          success: true,
          fallback: true,
          reason: "ai_unavailable",
          brainMap: {
            summary:
              "כרגע ניתוח ה־AI אינו זמין, לכן מוצגת מפת יכולות מקומית.",
            strongestSkill: "",
            weakestSkill: "",
            recommendation:
              "המשיכי לעבוד לפי המדריך החכם, המשימות והמילון האישי.",
            skills: normalizeBrainMapSkills(localSkills),
          },
        });
      }

      const brainMap = parseAIJson(response.text, {
        summary: "לא הצלחנו לנתח את מפת היכולות כרגע.",
        strongestSkill: "",
        weakestSkill: "",
        recommendation: "נסי לרענן שוב בעוד רגע.",
        skills: normalizeBrainMapSkills(localSkills),
      });

      return res.status(200).json({
        success: true,
        brainMap: {
          summary:
            brainMap.summary || "מפת היכולות נבנתה לפי נתוני הלמידה שלך.",
          strongestSkill: brainMap.strongestSkill || "",
          weakestSkill: brainMap.weakestSkill || "",
          recommendation:
            brainMap.recommendation || "בחרי תחום אחד קטן לחיזוק היום.",
          skills: normalizeBrainMapSkills(brainMap.skills || localSkills),
        },
      });
    } catch (error) {
      console.error("❌ Brain Map controller error:", error.message || error);

      return res.status(200).json({
        success: true,
        fallback: true,
        reason: "server_error",
        brainMap: {
          summary: "אירעה תקלה זמנית בבניית מפת היכולות.",
          strongestSkill: "",
          weakestSkill: "",
          recommendation: "נסי לרענן שוב בעוד רגע.",
          skills: [],
        },
      });
    }
  },

  // מאמן למידה אישי לתלמידה
  generateCoachPlan: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { note } = req.body;

      if (!note || !note.trim()) {
        return res.status(400).json({
          success: false,
          message: "נא לכתוב במה את רוצה עזרה או מה קשה לך היום",
        });
      }

      const user = await User.findById(userId)
        .select(
          "username email englishLevel favoriteHobbies expectations quizResults grammarHistory coachHistory"
        )
        .lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "משתמש לא נמצא",
        });
      }

      const userProfile = {
        username: user.username || "תלמידה",
        englishLevel: user.englishLevel || "beginner",
        favoriteHobbies: user.favoriteHobbies || [],
        expectations: user.expectations || [],
        recentQuizResults: (user.quizResults || []).slice(-5),
        recentGrammarHistory: (user.grammarHistory || []).slice(-3),
        recentCoachNotes: (user.coachHistory || [])
          .slice(-3)
          .map((item) => ({
            note: item.note,
            focus: item.plan?.focus,
            createdAt: item.createdAt,
          })),
        studentNote: note.trim(),
      };

      const prompt = `
You are an expert English learning coach for Hebrew-speaking students.

Create a short, practical, personal study plan for today.

Student profile:
${JSON.stringify(userProfile, null, 2)}

Important rules:
1. The response must be in Hebrew.
2. Keep it warm, encouraging, and practical.
3. Do not create a long plan. The student needs something doable today.
4. Use the student's level, hobbies, goals, recent history, and today's note.
5. Return strictly valid JSON only.
6. Do not wrap the JSON in markdown.
7. The steps must be short and concrete.

Return this exact JSON structure:
{
  "focus": "מיקוד קצר להיום",
  "summary": "משפט קצר שמסביר מה הבנת מהתלמידה",
  "steps": ["שלב 1", "שלב 2", "שלב 3"],
  "tip": "טיפ למידה קצר",
  "encouragement": "משפט עידוד אישי",
  "estimatedMinutes": 15
}
`;

      let response;

      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });
      } catch (aiError) {
        console.error("❌ AI Coach Gemini Error:", aiError.message || aiError);

        if (isRateLimitError(aiError)) {
          const fallbackPlan = getCoachFallbackPlan();

          await User.findByIdAndUpdate(userId, {
            $push: {
              coachHistory: {
                note: note.trim(),
                plan: fallbackPlan,
                createdAt: new Date(),
              },
            },
          });

          return res.status(200).json({
            success: true,
            plan: fallbackPlan,
            fallback: true,
            reason: "rate_limit",
          });
        }

        throw aiError;
      }

      const coachPlan = parseAIJson(response.text, getCoachFallbackPlan());

      await User.findByIdAndUpdate(userId, {
        $push: {
          coachHistory: {
            note: note.trim(),
            plan: coachPlan,
            createdAt: new Date(),
          },
        },
      });

      return res.status(200).json({
        success: true,
        plan: coachPlan,
      });
    } catch (error) {
      console.error("❌ AI Coach Error:", error.message || error);

      return res.status(200).json({
        success: true,
        plan: getCoachFallbackPlan(),
        fallback: true,
        reason: "server_error",
      });
    }
  },

  // קבלת היסטוריית המאמן של המשתמש
  getCoachHistory: async (req, res, next) => {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId).select("coachHistory").lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "משתמש לא נמצא",
        });
      }

      return res.status(200).json({
        success: true,
        history: (user.coachHistory || []).slice(-10).reverse(),
      });
    } catch (error) {
      next(error);
    }
  },
};

export default AiController;