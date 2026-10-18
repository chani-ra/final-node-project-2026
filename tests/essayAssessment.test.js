import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEssayAssessment } from "../service/essayAssessment.service.js";

const valid = { score: 0, generalFeedback: " משוב תקין ", grammarCorrections: [] };
test("valid zero scores are preserved without fallback values", () => {
  assert.deepEqual(parseEssayAssessment(JSON.stringify(valid)), { ...valid, generalFeedback: "משוב תקין" });
});
test("missing, malformed and fabricated scoring information is rejected", () => {
  for (const raw of ["", "{bad", "{}", "null", JSON.stringify({ ...valid, score: "85" }), JSON.stringify({ ...valid, score: 101 }), JSON.stringify({ ...valid, grammarCorrections: null }), JSON.stringify({ ...valid, generalFeedback: " " })]) {
    assert.equal(parseEssayAssessment(raw), null);
  }
});
test("incomplete correction details invalidate the assessment", () => {
  assert.equal(parseEssayAssessment(JSON.stringify({ ...valid, grammarCorrections: [{ mistake: "is", correction: "" }] })), null);
});
