// A partial OpenAI Responses API result must never be persisted as a finished lesson.
export function openaiLessonConfig({ model, instructions, prompt }) {
  return {
    model,
    instructions,
    input: prompt,
    max_output_tokens: 4096,
    store: false,
  };
}

export function readCompletedOpenAILesson(result) {
  if (result?.status !== "completed") {
    const error = new Error("המודל לא השלים את יצירת השיעור. נסי שוב");
    error.statusCode = 503;
    throw error;
  }

  const text = typeof result.output_text === "string" ? result.output_text.trim() : "";
  if (!text) {
    const error = new Error("לא התקבל תוכן שיעור מהמודל. נסי שוב");
    error.statusCode = 503;
    throw error;
  }
  return text;
}
