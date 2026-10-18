import { test } from "node:test";
import assert from "node:assert/strict";
import { openaiLessonConfig, readCompletedOpenAILesson } from "../service/learning/providers/openaiLessonResult.js";

test("OpenAI lesson request preserves selected model and does not store response at provider", () => {
  const config = openaiLessonConfig({ model: "gpt-4.1-mini", instructions: "Teach English", prompt: "Past Simple" });
  assert.equal(config.model, "gpt-4.1-mini");
  assert.equal(config.instructions, "Teach English");
  assert.equal(config.input, "Past Simple");
  assert.equal(config.max_output_tokens, 4096);
  assert.equal(config.store, false);
});

test("completed OpenAI response returns its full lesson", () => {
  assert.equal(readCompletedOpenAILesson({ status: "completed", output_text: "  # Lesson " }), "# Lesson");
});

test("incomplete OpenAI response is rejected, even when it contains partial text", () => {
  assert.throws(
    () => readCompletedOpenAILesson({ status: "incomplete", output_text: "Partial lesson", incomplete_details: { reason: "max_output_tokens" } }),
    { statusCode: 503 }
  );
});

test("empty and failed OpenAI responses cannot be saved as lessons", () => {
  assert.throws(() => readCompletedOpenAILesson({ status: "completed", output_text: "" }), { statusCode: 503 });
  assert.throws(() => readCompletedOpenAILesson({ status: "failed", output_text: "" }), { statusCode: 503 });
  assert.throws(() => readCompletedOpenAILesson(undefined), { statusCode: 503 });
});
