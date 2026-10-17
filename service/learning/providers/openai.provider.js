import OpenAI from "openai";

export async function generateWithOpenAI({ model, instructions, prompt }) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 1, timeout: 30_000 });
  const result = await client.responses.create({
    model,
    instructions,
    input: prompt,
    max_output_tokens: 1800,
    store: false,
  });
  return typeof result.output_text === "string" ? result.output_text.trim() : "";
}
