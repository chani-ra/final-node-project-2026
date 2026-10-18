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

import { lessonInstructions } from "../service/learning/providers/lessonInstructions.js";

test("short stories are available independently under reading and listening", () => {
  const reading = LEARNING_TOPICS.find((topic) => topic.slug === "reading");
  const listening = LEARNING_TOPICS.find((topic) => topic.slug === "listening");
  assert.ok(reading?.subcategories.some((topic) => topic.slug === "short-stories"));
  assert.ok(listening?.subcategories.some((topic) => topic.slug === "short-stories"));
  assert.equal(new Set(listening.subcategories.map((topic) => topic.slug)).size, listening.subcategories.length);
});

test("listening stories have focused instructions without changing grammar lessons", () => {
  const listening = lessonInstructions({ category: "Listening", subcategory: "Short Stories", level: "beginner" });
  const grammar = lessonInstructions({ category: "Grammar", subcategory: "Past Simple", level: "beginner" });
  assert.match(listening, /Listening Script/);
  assert.match(listening, /comprehension questions/);
  assert.doesNotMatch(grammar, /Listening Script/);
});
