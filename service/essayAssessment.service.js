export function parseEssayAssessment(rawText) {
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    return null;
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  if (typeof data.score !== "number" || !Number.isFinite(data.score) || data.score < 0 || data.score > 100) return null;
  if (typeof data.generalFeedback !== "string" || !data.generalFeedback.trim()) return null;
  if (!Array.isArray(data.grammarCorrections)) return null;
  const validCorrections = data.grammarCorrections.every((item) =>
    item && typeof item.mistake === "string" && item.mistake.trim() &&
    typeof item.correction === "string" && item.correction.trim() &&
    (item.explanation == null || typeof item.explanation === "string")
  );
  if (!validCorrections) return null;

  return {
    score: data.score,
    generalFeedback: data.generalFeedback.trim(),
    grammarCorrections: data.grammarCorrections,
  };
}
