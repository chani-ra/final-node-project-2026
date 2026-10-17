import { test } from "node:test";
import assert from "node:assert/strict";
import { learningPromptSchema, historyQuerySchema, adminHistoryQuerySchema } from "../validation/learning.validation.js";

const categoryId = "507f1f77bcf86cd799439011";
const subcategoryId = "507f191e810c19729de860ea";

test("valid lesson request accepts category, subcategory and prompt", () => {
  const { error, value } = learningPromptSchema.validate({
    categoryId, subcategoryId, prompt: "Teach me Past Simple",
  });
  assert.equal(error, undefined);
  assert.equal(value.prompt, "Teach me Past Simple");
});

test("rejects mismatched identifiers, blank prompts and unexpected fields", () => {
  const valid = { categoryId, subcategoryId, prompt: "Teach me Past Simple" };
  for (const bad of [
    { ...valid, categoryId: "invalid" },
    { ...valid, prompt: "   " },
    { ...valid, prompt: "a".repeat(801) },
    { ...valid, userId: categoryId },
  ]) assert.ok(learningPromptSchema.validate(bad).error);
});

test("pagination enforces bounded positive page size", () => {
  assert.deepEqual(historyQuerySchema.validate({}).value, { page: 1, limit: 10 });
  assert.ok(historyQuerySchema.validate({ limit: 100 }).error);
  assert.ok(historyQuerySchema.validate({ page: -1 }).error);
});

test("students cannot select a different user in history query", () => {
  assert.ok(historyQuerySchema.validate({ userId: categoryId }).error);
  assert.equal(adminHistoryQuerySchema.validate({ userId: categoryId }).error, undefined);
});
