import { generateWithGemini } from "./gemini.provider.js";
import { generateWithOpenAI } from "./openai.provider.js";
import { resolveProvider } from "./providerCatalog.js";

const implementations = Object.freeze({
  gemini: generateWithGemini,
  openai: generateWithOpenAI,
});

export async function generateWithProvider({ provider = "gemini", instructions, prompt }) {
  const selected = resolveProvider(provider);
  const response = await implementations[selected.id]({
    model: selected.model,
    instructions,
    prompt,
  });
  return { provider: selected.id, model: selected.model, response };
}
