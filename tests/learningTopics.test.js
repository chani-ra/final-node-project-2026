import { test } from "node:test";
import assert from "node:assert/strict";
import { LEARNING_TOPICS } from "../service/learning/topics.js";

test("learning categories have unique slugs and meaningful names", () => {
  const slugs = LEARNING_TOPICS.map((topic) => topic.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.ok(LEARNING_TOPICS.length >= 2);
  for (const category of LEARNING_TOPICS) {
    assert.ok(category.name.length > 2);
    assert.ok(category.subcategories.length > 0);
  }
});

test("subcategory slugs are unique within each category", () => {
  for (const category of LEARNING_TOPICS) {
    const ids = category.subcategories.map((item) => item.slug);
    assert.equal(ids.length, new Set(ids).size);
    assert.ok(category.subcategories.every((item) => item.name.length > 2));
  }
});
