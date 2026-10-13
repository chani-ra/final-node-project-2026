export function makeExerciseSpec(body = {}) {
  const request = String(body.prompt || body.topic || "")
    .trim()
    .slice(0, 3000);

  const numeric = request.match(
    /(?:^|\s)(\d{1,2})\s*(?:שאלות|תרגילים|questions)/i
  ) || request.match(
    /(?:שאלות|questions)\s*(\d{1,2})/i
  );

  const numbers = {
    "ארבע": 4, "ארבעה": 4,
    "שלוש": 3, "שלושה": 3,
    "חמש": 5, "חמישה": 5,
    "שש": 6, "שישה": 6,
  };

  const word = request.match(
    /(ארבע|ארבעה|שלוש|שלושה|חמש|חמישה|שש|שישה)\s+שאלות/
  );

  const count = numeric
    ? Number(numeric[1])
    : word
      ? numbers[word[1]]
      : Number(body.questionCount || 4);

  if (!Number.isInteger(count) || count < 1 || count > 20) {
    const error = new Error(
      "מספר השאלות חייב להיות בין 1 ל־20"
    );
    error.status = 400;
    throw error;
  }

  const open = /(פתוח|פתוחות|חופשי|חופשיות|open.?ended|free.?response)/i
    .test(request);

  const multiple = /(אמריקאיות|רב.?ברירה|multiple.?choice)/i
    .test(request);

  const fill = /(השלמ|מילוי חסר|fill.?in)/i
    .test(request);

  const mode = ["open", "multiple", "fill"].includes(
    body.questionFormat
  )
    ? body.questionFormat
    : open
      ? "open"
      : multiple
        ? "multiple"
        : fill
          ? "fill"
          : "open";

  return {
    request,
    count,
    mode,
    level: String(body.level || "beginner"),
    category: String(body.category || "general"),
    topic: String(body.topic || ""),
  };
}

export function exercisePrompt(spec) {
  return [
    "You are an English teacher for Hebrew-speaking students.",
    "Teacher request: " + JSON.stringify(spec.request),
    "Topic: " + spec.topic,
    "Level: " + spec.level,
    "Category: " + spec.category,
    "Create EXACTLY " + spec.count + " independent questions.",
    spec.mode === "open"
      ? "OPEN QUESTIONS: Require an answer in the student's own words. No blanks or multiple choice. correctAnswer is ONE EXAMPLE answer, not the only acceptable answer."
      : spec.mode === "fill"
        ? "FILL IN: Each sentence has one ___ blank. options must be []."
        : "MULTIPLE CHOICE: Each question has four options, including the correctAnswer.",
    "Return JSON object only:",
    '{"title":"...","description":"...","instructions":"short Hebrew instructions","questions":[{"number":1,"sentence":"English question","options":[],"correctAnswer":"model answer","hint":"short Hebrew explanation"}]}',
    "Every question needs a nonempty sentence and correctAnswer.",
    "The questions array must have exactly " + spec.count + " items.",
  ].join("\n");
}
