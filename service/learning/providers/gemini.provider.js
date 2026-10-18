import { GoogleGenAI } from "@google/genai";
import { geminiLessonConfig, readCompletedGeminiLesson } from "./geminiLessonResult.js";

export async function generateWithGemini({ model, instructions, prompt }) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const result = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: geminiLessonConfig({ model, instructions }),
  });
  return readCompletedGeminiLesson(result);
}
