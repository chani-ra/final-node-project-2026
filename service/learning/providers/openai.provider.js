import OpenAI from "openai";
import { openaiLessonConfig, readCompletedOpenAILesson } from "./openaiLessonResult.js";

export async function generateWithOpenAI({ model, instructions, prompt }) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 1, timeout: 30_000 });
  const result = await client.responses.create(openaiLessonConfig({ model, instructions, prompt }));
  return readCompletedOpenAILesson(result);
}
