import { test } from "node:test";
import assert from "node:assert/strict";
import { LEARNING_PROVIDERS, resolveProvider, listProviders } from "../service/learning/providers/providerCatalog.js";
import { lessonInstructions } from "../service/learning/providers/lessonInstructions.js";

test("provider catalog is limited to two explicit supported providers", () => {
  assert.deepEqual(Object.keys(LEARNING_PROVIDERS), ["gemini", "openai"]);
});

test("Gemini remains the default for clients that do not send provider", () => {
  assert.deepEqual(resolveProvider(undefined, { GEMINI_API_KEY: "a" }), { id: "gemini", model: "gemini-2.5-flash" });
});

test("OpenAI is available only if the backend key is configured", () => {
  assert.throws(() => resolveProvider("openai", {}), { statusCode: 503 });
  assert.deepEqual(resolveProvider("openai", { OPENAI_API_KEY: "a" }), { id: "openai", model: "gpt-4.1-mini" });
});

test("server env can select a model but a student cannot choose an arbitrary provider", () => {
  assert.deepEqual(resolveProvider("openai", { OPENAI_API_KEY: "a", OPENAI_LEARNING_MODEL: "gpt-4.1" }), { id: "openai", model: "gpt-4.1" });
  assert.throws(() => resolveProvider("untrusted", { OPENAI_API_KEY: "a" }), { statusCode: 400 });
});

test("provider discovery has no API keys and marks absent providers unavailable", () => {
  const providers = listProviders({ GEMINI_API_KEY: "secret-example" });
  assert.deepEqual(providers.map(({ id, available }) => [id, available]), [["gemini", true], ["openai", false]]);
  assert.equal(JSON.stringify(providers).includes("secret-example"), false);
});

test("both engines receive the same lesson structure", () => {
  const instructions = lessonInstructions({ category: "Grammar", subcategory: "Past Simple", level: "beginner" });
  for (const label of ["Grammar", "Past Simple", "beginner", "Markdown", "suggested answers"]) {
    assert.ok(instructions.includes(label));
  }
});
