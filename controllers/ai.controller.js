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

// בדיקה קצרה אם ההודעה קשורה ללימוד אנגלית
const isEnglishLearningRequest = (message = "") => {
    const text = message.toLowerCase();

    const hasEnglishText = /[a-zA-Z]/.test(text);

    const learningPattern =
        /(אנגלית|דקדוק|תרגום|תרגם|מילה|מילים|משפט|משפטים|ביטוי|ביטויים|שיחה|דיבור|הגייה|כתיבה|קריאה|שמיעה|ללמוד|תלמד|לתרגל|תסביר|הסבר|תקן|תתקן|עבר|הווה|עתיד|זמן|זמנים|פועל|פעלים|שם עצם|שם תואר|עבר מושלם|עבר פשוט|הווה פשוט|הווה מושלם|english|grammar|vocabulary|sentence|word|translate|conversation|practice|correct|meaning|pronunciation|tense|verb|past|present|future|perfect|simple)/i;

    return hasEnglishText || learningPattern.test(text);
};


export const AiController = {
    // תיקון דקדוק + שמירה ל-DB
    correctGrammar: async (req, res, next) => {
        try {
            const { text } = req.body;
            const userId = req.user.id;

            if (!text) {
                return res.status(400).json({
                    success: false,
                    message: "Text is required",
                });
            }

            const prompt = `You are an English teacher for Hebrew speakers. Correct the grammar and spelling. Return JSON: {"original": "${text}", "corrected": "...", "explanation": "הסבר בעברית"}. Text: "${text}"`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: { responseMimeType: "application/json" },
            });

            const aiResult = parseAIJson(response.text, {
                original: text,
                corrected: text,
                explanation: "לא הצלחנו לנתח את תשובת ה-AI.",
            });

            await User.findByIdAndUpdate(
                userId,
                {
                    $push: { grammarHistory: aiResult },
                },
                { new: true }
            );

            console.log("✅ Grammar data saved successfully to DB for user:", userId);

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

            if (!text) {
                return res.status(400).json({
                    success: false,
                    message: "Text is required",
                });
            }

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Translate the following text into ${targetLang}. Return ONLY the translated text.\nText: "${text}"`,
            });

            return res.status(200).json({
                success: true,
                translation: response.text.trim(),
            });
        } catch (error) {
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
"${cleanMessage}"

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

            return res.status(500).json({
                success: false,
                message: "שגיאה בצ׳אט AI",
            });
        }
    },

    // יצירת תרגילים
    generateExercise: async (req, res, next) => {
        try {
            const { topic, level, exerciseType, prompt } = req.body;

            const finalTopic = topic || prompt || "English practice";
            const finalLevel = level || "intermediate";
            const finalType = exerciseType || "vocabulary";

            const aiPrompt = `Create a ${finalType} exercise about "${finalTopic}" for ${finalLevel} level. Return strictly as JSON array: [{"sentence": "...", "correctAnswer": "...", "hint": "..."}]`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: aiPrompt,
                config: { responseMimeType: "application/json" },
            });

            const data = parseAIJson(response.text, []);

            return res.status(200).json({
                success: true,
                data,
            });
        } catch (error) {
            next(error);
        }
    },

    // בדיקת חיבור
    checkEssay: async (req, res, next) => {
        try {
            const { text, studentLevel } = req.body;

            if (!text) {
                return res.status(400).json({
                    success: false,
                    message: "Text is required",
                });
            }

            const prompt = `Review this essay (level ${studentLevel || "intermediate"}). Return JSON: {"score": 85, "generalFeedback": "...", "grammarCorrections": [{"mistake": "...", "correction": "...", "explanation": "..."}]}. Essay: "${text}"`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: { responseMimeType: "application/json" },
            });

            const data = parseAIJson(response.text, {
                score: 0,
                generalFeedback: "לא הצלחנו לנתח את החיבור כרגע.",
                grammarCorrections: [],
            });

            return res.status(200).json({
                success: true,
                data,
            });
        } catch (error) {
            next(error);
        }
    },

    // יצירת בחן אמריקאי
    generateQuiz: async (req, res, next) => {
        try {
            const { topic, difficulty, questionCount } = req.body;

            const prompt = `Create a quiz about "${topic || "English"}" at ${difficulty || "intermediate"
                } difficulty. Generate ${questionCount || 5
                } questions. Return JSON array: [{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "..."}]`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: { responseMimeType: "application/json" },
            });

            const questions = parseAIJson(response.text, []);

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
            const prompt = `Generate a 4-week study schedule.
Important: the text must be in Hebrew.
Add feedback and wishes at the end of the plan.
Return JSON array: [{"week": 1, "focus": "...", "tasks": ["..."]}].`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: { responseMimeType: "application/json" },
            });

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

            const prompt = `Provide 3 study tips for level ${level || "intermediate"
                } in ${focusArea || "general"}.
Important: The explanation must be in Hebrew and in English.
Return JSON array of strings.`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: { responseMimeType: "application/json" },
            });

            const tips = parseAIJson(response.text, []);

            return res.status(200).json({
                success: true,
                tips,
            });
        } catch (error) {
            next(error);
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

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: { responseMimeType: "application/json" },
            });

            const coachPlan = parseAIJson(response.text, {
                focus: "תרגול קצר להיום",
                summary: "נראה שכדאי לך לעבוד היום בצעד קטן וברור.",
                steps: [
                    "בחרי שיעור או שיר קצר.",
                    "כתבי 3 מילים חדשות.",
                    "אמרי בקול משפט אחד באנגלית.",
                ],
                tip: "עדיף להתקדם מעט בכל יום מאשר להעמיס יותר מדי.",
                encouragement: "כל צעד קטן באנגלית בונה ביטחון.",
                estimatedMinutes: 15,
            });

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
            next(error);
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