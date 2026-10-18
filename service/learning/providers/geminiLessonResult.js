// The 2.5 Flash model can spend the output token budget on internal thinking.
// For short teaching lessons, reserve the budget for the actual lesson text.
export function geminiLessonConfig({ model, instructions }) {
  return {
    systemInstruction: instructions,
    temperature: 0.5,
    maxOutputTokens: 4096,
    ...(model.startsWith("gemini-2.5-flash")
      ? { thinkingConfig: { thinkingBudget: 0 } }
      : {}),
  };
}

function unavailableLesson(message) {
  const error = new Error(message);
  error.statusCode = 503;
  return error;
}

export function readCompletedGeminiLesson(result) {
  const finishReason = result?.candidates?.[0]?.finishReason;
  if (finishReason && finishReason !== "STOP") {
    // Never persist an incomplete candidate just because it contains some text.
    throw unavailableLesson("המודל לא השלים את יצירת השיעור. נסי שוב");
  }

  const text = typeof result?.text === "string" ? result.text.trim() : "";
  if (!text) throw unavailableLesson("לא התקבל תוכן שיעור מהמודל. נסי שוב");
  return text;
}
