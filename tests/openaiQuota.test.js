import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import LearningDailyQuota from "../models/learningDailyQuota.model.js";
import { reserveOpenAILesson } from "../service/learning/openaiQuota.service.js";

let db;
before(async () => {
  db = await MongoMemoryServer.create();
  await mongoose.connect(db.getUri());
  await LearningDailyQuota.init();
});
beforeEach(async () => { await LearningDailyQuota.deleteMany({}); });
after(async () => {
  await mongoose.disconnect();
  if (db) await db.stop();
});

const userA = "6ad41edc9c3ff98f304df0aa";
const userB = "6ad41edc9c3ff98f304df0bb";
const now = new Date("2026-10-18T11:00:00Z");
const claim = (userId, options = {}) => reserveOpenAILesson({
  userId, now, globalLimit: 5, perUserLimit: 3, ...options,
});

test("quota rejects calls over per-user and global limits without increasing counters", async () => {
  for (let i = 0; i < 3; i++) await claim(userA);
  await assert.rejects(claim(userA), { statusCode: 429 });
  await claim(userB);
  await claim(userB);
  await assert.rejects(claim(userB), { statusCode: 429 });
  const record = await LearningDailyQuota.findById("openai:2026-10-18").lean();
  assert.equal(record.total, 5);
  assert.equal(record.users[userA], 3);
  assert.equal(record.users[userB], 2);
});

test("quota cannot be exceeded by concurrent requests", async () => {
  const outcomes = await Promise.allSettled(Array.from({ length: 25 }, () => claim(userA)));
  assert.equal(outcomes.filter((item) => item.status === "fulfilled").length, 3);
  assert.equal(outcomes.filter((item) => item.status === "rejected").length, 22);
  const record = await LearningDailyQuota.findById("openai:2026-10-18").lean();
  assert.equal(record.total, 3);
});

test("quota resets on the next UTC day", async () => {
  await claim(userA, { globalLimit: 1, perUserLimit: 1 });
  await assert.rejects(claim(userA, { globalLimit: 1, perUserLimit: 1 }), { statusCode: 429 });
  await claim(userA, { now: new Date("2026-10-19T00:00:00Z"), globalLimit: 1, perUserLimit: 1 });
  assert.equal(await LearningDailyQuota.countDocuments(), 2);
});

test("zero quota blocks requests without reserving paid API slots", async () => {
  await assert.rejects(claim(userA, { globalLimit: 0 }), { statusCode: 429 });
  assert.equal(await LearningDailyQuota.countDocuments(), 0);
});
