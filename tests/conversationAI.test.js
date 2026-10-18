import { test } from "node:test";
import assert from "node:assert/strict";

process.env.GEMINI_API_KEY ||= "test-key";
const { generateConversationReply } = await import("../service/conversationAI.service.js");

const message = "Please correct my English sentence";

test("valid Gemini response is returned without alteration", async () => {
  const result = await generateConversationReply({ message }, async () => ({ text: "  Fixed sentence.  " }));
  assert.equal(result, "Fixed sentence.");
});

test("Gemini rate limit fails with HTTP 429 rather than fabricating an AI reply", async () => {
  await assert.rejects(
    generateConversationReply({ message }, async () => { throw { status: 429, message: "quota" }; }),
    { statusCode: 429 }
  );
});

test("Gemini connection errors fail with HTTP 503", async () => {
  await assert.rejects(
    generateConversationReply({ message }, async () => { throw new Error("network unavailable"); }),
    { statusCode: 503 }
  );
});

test("empty Gemini response fails with HTTP 502", async () => {
  await assert.rejects(
    generateConversationReply({ message }, async () => ({ text: "  " })),
    { statusCode: 502 }
  );
});

test("off-topic requests use a deterministic redirection without an AI call", async () => {
  const reply = await generateConversationReply({ message: "123456" }, async () => { throw Error("unexpected AI call"); });
  assert.match(reply, /אנגלית/);
});
