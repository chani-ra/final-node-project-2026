// The UI can offer only providers enabled on the server. Never send API keys to clients.
export const LEARNING_PROVIDERS = Object.freeze({
  gemini: { id: "gemini", label: "Google Gemini", envKey: "GEMINI_API_KEY", modelEnv: "GEMINI_LEARNING_MODEL", defaultModel: "gemini-2.5-flash" },
  openai: { id: "openai", label: "OpenAI GPT", envKey: "OPENAI_API_KEY", modelEnv: "OPENAI_LEARNING_MODEL", defaultModel: "gpt-4.1-mini" },
});

export const resolveProvider = (id = "gemini", env = process.env) => {
  const entry = LEARNING_PROVIDERS[id];
  if (!entry) {
    const error = new Error("ספק ה-AI שנבחר אינו נתמך");
    error.statusCode = 400;
    throw error;
  }
  if (!env[entry.envKey]?.trim()) {
    const error = new Error("מנוע ה-AI המבוקש אינו זמין כרגע");
    error.statusCode = 503;
    throw error;
  }
  return { id, model: env[entry.modelEnv]?.trim() || entry.defaultModel };
};

export const listProviders = (env = process.env) => Object.values(LEARNING_PROVIDERS).map((entry) => ({
  id: entry.id,
  label: entry.label,
  available: Boolean(env[entry.envKey]?.trim()),
}));
