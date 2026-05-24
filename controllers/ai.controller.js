import { GoogleGenAI } from '@google/genai';

import User from '../models/users.model.js';

// חיבור ל-Gemini באמצעות מפתח ה-API מהסביבה
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const AiController = {

    // 📝 1. תיקון דקדוק + שמירה ל-DB
    correctGrammar: async (req, res, next) => {
        try {
            const { text } = req.body;
            const userId = req.user.id;
            if (!text) return res.status(400).json({ message: 'Text is required' });

            const prompt = `You are an English teacher for Hebrew speakers. Correct the grammar and spelling. Return JSON: {"original": "${text}", "corrected": "...", "explanation": "הסבר בעברית"}. Text: "${text}"`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

            const aiResult = JSON.parse(response.text);

            // עדכון המשתמש ושמירה ב-DB
            const updatedUser = await User.findByIdAndUpdate(userId, {
                $push: { grammarHistory: aiResult }
            }, { new: true });

            // הדפסה לטרמינל כדי לוודא שמירה
            console.log("✅ Data saved successfully to DB for user:", userId);
            console.log("📝 New history entry:", aiResult);

            res.status(200).json({ success: true, data: aiResult });
        } catch (error) {
            next(error);
        }
    },

    // 🌐 2. תרגום טקסט
    translateText: async (req, res, next) => {
        try {
            const { text, targetLang = 'Hebrew' } = req.body;
            if (!text) return res.status(400).json({ message: 'Text is required' });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Translate the following text into ${targetLang}. Return ONLY the translated text.\nText: "${text}"`
            });

            res.status(200).json({ success: true, translation: response.text.trim() });
        } catch (error) {
            next(error);
        }
    },

    // 💬 3. תרגול שיחה
    conversation: async (req, res, next) => {
        try {
            const { message, level } = req.body;
            if (!message) return res.status(400).json({ message: 'Message is required' });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `You are a friendly English conversation partner. Respond to: "${message}" for ${level || 'intermediate'} level.`
            });
            res.status(200).json({ success: true, reply: response.text.trim() });
        } catch (error) {
            next(error);
        }
    },

    // 🎯 4. יצירת תרגילים
    generateExercise: async (req, res, next) => {
        try {
            const { topic, level, exerciseType } = req.body;
            const prompt = `Create a ${exerciseType || 'vocabulary'} exercise about "${topic}" for ${level || 'intermediate'} level. Return strictly as JSON array: [{"sentence": "...", "correctAnswer": "...", "hint": "..."}]`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

            res.status(200).json({ success: true, data: JSON.parse(response.text) });
        } catch (error) {
            next(error);
        }
    },

    // ✍️ 5. בדיקת חיבור
    checkEssay: async (req, res,  next) => {
        try {
            const { text, studentLevel } = req.body;
            const prompt = `Review this essay (level ${studentLevel || 'intermediate'}). Return JSON: {"score": 85, "generalFeedback": "...", "grammarCorrections": [{"mistake": "...", "correction": "...", "explanation": "..."}]}. Essay: "${text}"`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

            res.status(200).json({ success: true, data: JSON.parse(response.text) });
        } catch (error) {
            next(error);
        }
    },

    // 🧠 6. יצירת בחן אמריקאי
    generateQuiz: async (req, res, next) => {
        try {
            const { topic, difficulty, questionCount } = req.body;
            const prompt = `Create a quiz about "${topic}". Generate ${questionCount || 5} questions. Return JSON array: [{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "..."}]`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

            res.status(200).json({ success: true, questions: JSON.parse(response.text) });
        } catch (error) {
            next(error);
        }
    },

    // 💡 7. שמירת תוצאות בוחן (הפיצ'ר החדש שלך)
    saveQuizResult: async (req, res, next) => {
        try {
            const { topic, score, totalQuestions } = req.body;
            const userId = req.user.id;
            await User.findByIdAndUpdate(userId, {
                $push: { quizResults: { topic, score, totalQuestions, completedAt: new Date() } }
            });
            res.status(200).json({ success: true, message: 'Quiz result saved!' });
        } catch (error) {
            next(error);
        }
    },

    // 📈 8. יצירת תוכנית למידה
    generateLearningPlan: async (req, res, next) => {
        try {
            const prompt = `Generate a 4-week study schedule.
            Important: the text must be in Hebrew .
            // Add feedback and wishes at the end of the plan.
            // Address the user's name.
             Return JSON array: [{"week": 1, "focus": "...", "tasks": ["..."]}].`;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            res.status(200).json({ success: true, plan: JSON.parse(response.text) });
        } catch (error) {
            console.error('❌ AI Learning Plan Error:', error.message || error);
            next(error);
        }
    },

    // 💡 9. טיפים ללמידה
    getStudyTips: async (req, res, next) => {
        try {
            const { level, focusArea } = req.query;
            const prompt = `Provide 3 study tips for level ${level || 'intermediate'} in ${focusArea || 'general'}.
            Important: The explanation must be in Hebrew and in English.
            Return JSON array of strings.`;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            res.status(200).json({ success: true, tips: JSON.parse(response.text) });
        } catch (error) {
            next(error);
        }
    }
};

export default AiController;