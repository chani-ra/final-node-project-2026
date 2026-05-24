import { GoogleGenAI } from '@google/genai';

// הגדרת החיבור ל-Gemini עם המפתח מקובץ ה-.env
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const AiController = {

    // 📝 פיצ'ר 1: בדיקת חיבור חופשי של תלמיד
    checkEssay: async (req, res) => {
        try {
            const { text, studentLevel } = req.body;

            if (!text) {
                return res.status(400).json({ message: 'נא לשלוח טקסט לבדיקה' });
            }

            const level = studentLevel || 'intermediate';
            
            const prompt = `
            You are an expert English teacher. 
            Review the following essay written by an ${level} English student.
            Please analyze the text and provide the output strictly as a JSON object with the following structure:
            {
                "originalText": "the text submitted",
                "score": a number from 0 to 100 representing the grade,
                "generalFeedback": "A short, encouraging summary of how they did",
                "grammarCorrections": [
                    { "mistake": "the incorrect word/phrase", "correction": "the correct word/phrase", "explanation": "why it was wrong" }
                ]
            }
            
            Here is the text to check:
            "${text}"
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json", // מכריח את ה-AI להחזיר JSON תקין
                }
            });

            // חילוץ התשובה מהמודל
            const result = JSON.parse(response.text());

            res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Error in checkEssay:', error);
            res.status(500).json({ success: false, message: 'שגיאה בבדיקת החיבור מול ה-AI' });
        }
    },

    // 🧠 פיצ'ר 2: יצירת בחן אמריקאי אוטומטי
    generateQuiz: async (req, res) => {
        try {
            const { topic, level, numberOfQuestions } = req.body;

            if (!topic) {
                return res.status(400).json({ message: 'נא לספק נושא לבחן' });
            }

            const qCount = numberOfQuestions || 5;
            const engLevel = level || 'intermediate';

            const prompt = `
            You are an expert English course creator.
            Create a multiple-choice English quiz about "${topic}" suitable for ${engLevel} level students.
            Generate exactly ${qCount} questions.
            Return the result strictly as a JSON array containing objects with the exact following structure:
            [
                {
                    "question": "The question text",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correctAnswer": "The exact matching string from the options array",
                    "points": 10
                }
            ]
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                }
            });

            const questions = JSON.parse(response.text());

            res.status(200).json({
                success: true,
                topic,
                level: engLevel,
                questions
            });

        } catch (error) {
            console.error('Error in generateQuiz:', error);
            res.status(500).json({ success: false, message: 'שגיאה ביצירת הבחן מול ה-AI' });
        }
    }
};

export default AiController;