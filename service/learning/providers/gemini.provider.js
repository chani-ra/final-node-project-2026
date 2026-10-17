import { GoogleGenAI } from "@google/genai";

export async function generateWithGemini({ model, instructions, prompt }) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const result = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { systemInstruction: instructions, temperature: 0.5, maxOutputTokens: 1800 },
  });
  return typeof result.text === "string" ? result.text.trim() : "";
}
