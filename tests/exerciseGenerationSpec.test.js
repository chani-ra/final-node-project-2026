import test from "node:test";
import assert from "node:assert/strict";
import {
  makeExerciseSpec,
  exercisePrompt,
} from "../service/exerciseGenerationSpec.service.js";

test("teacher request generates four open questions", () => {
  const spec = makeExerciseSpec({
    prompt: "צרי 4 שאלות פתוחות על תחביבים",
    questionCount: 5,
  });

  assert.equal(spec.count, 4);
  assert.equal(spec.mode, "open");
  assert.match(
    exercisePrompt(spec),
    /EXACTLY 4 independent questions/
  );
});

test("question count outside allowed limits is rejected", () => {
  assert.throws(
    () => makeExerciseSpec({
      prompt: "צרי 25 שאלות פתוחות",
    }),
    /1 ל־20/
  );
});
