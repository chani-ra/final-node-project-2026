import { test } from "node:test";
import assert from "node:assert/strict";
import { geminiLessonConfig, readCompletedGeminiLesson } from "../service/learning/providers/geminiLessonResult.js";

test("2.5 Flash gives lesson tokens to output rather than internal thinking", () => {
  const config = geminiLessonConfig({ model: "gemini-2.5-flash", instructions: "Teach English" });
  assert.equal(config.systemInstruction, "Teach English");
  assert.equal(config.thinkingConfig.thinkingBudget, 0);
  assert.equal(config.maxOutputTokens, 4096);
});

test("other models do not receive a 2.5-only thinking configuration", () => {
  const config = geminiLessonConfig({ model: "gemini-3-flash", instructions: "Teach English" });
  assert.equal(config.thinkingConfig, undefined);
});

test("returns complete lesson when Gemini stops normally", () => {
  assert.equal(readCompletedGeminiLesson({ text: "  # My lesson ", candidates: [{ finishReason: "STOP" }] }), "# My lesson");
});

test("rejects a partial response when Gemini exhausts its token budget", () => {
  assert.throws(
    () => readCompletedGeminiLesson({ text: "We use the tense when", candidates: [{ finishReason: "MAX_TOKENS" }] }),
    (error) => error.statusCode === 503
  );
});

test("rejects blocked and empty responses instead of saving them", () => {
  assert.throws(() => readCompletedGeminiLesson({ text: "Partial", candidates: [{ finishReason: "SAFETY" }] }), { statusCode: 503 });
  assert.throws(() => readCompletedGeminiLesson({ text: "", candidates: [{ finishReason: "STOP" }] }), { statusCode: 503 });
});
