import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const isRateLimitError = (error) =>
  error?.status === 429 || error?.code === 429 ||
  /429|too many requests|quota/i.test(error?.message || "");

const isEnglishLearningRequest = (message) =>
  /[a-zA-Z]/.test(message) ||
  /(אנגלית|דקדוק|תרגום|תרגם|מילה|מילים|משפט|ביטוי|שיחה|דיבור|הגייה|כתיבה|קריאה|שמיעה|ללמוד|לתרגל|תסביר|הסבר|תקן|עבר|הווה|עתיד|זמן|זמנים|פועל|english|grammar|vocabulary|sentence|word|translate|conversation|practice|correct|meaning|pronunciation|tense|verb|past|present|future|perfect|simple)/i.test(message);

export async function generateConversationReply({ message, level = "beginner" }) {
  const cleanMessage = typeof message === "string" ? message.trim() : "";
  if (!cleanMessage) throw new TypeError("Message is required");
  if (!isEnglishLearningRequest(cleanMessage)) {
    return "אני כאן כדי לעזור רק בלימוד אנגלית 😊\nאפשר לבקש ממני: לתרגל שיחה, לתקן משפט, להסביר מילה, ללמוד דקדוק, להבין זמנים באנגלית או לבנות משפטים.";
  }

  const studentLevel = ["beginner", "intermediate", "advanced"].includes(level) ? level : "beginner";
  const prompt = `
You are "Bolt AI", an English learning assistant for Hebrew-speaking students.

Your role:
- Help the student learn English.
- Explain English grammar clearly in Hebrew.
- Help with English vocabulary, expressions, translation, sentence building and conversation practice.
- Correct English sentences gently.
- If the student asks about English grammar topics such as Past Perfect, Present Simple, Past Simple, Present Perfect, Future, tenses, verbs, nouns, adjectives — explain them clearly.
- If the student asks for a deeper explanation, give a deeper explanation, but keep it organized and practical.
- Ask one short practice question at the end when useful.

Student level: ${studentLevel}

Student message:
${JSON.stringify(cleanMessage)}

Important rules:
1. Stay focused only on English learning.
2. If the student asks about something unrelated to English learning, politely redirect back to English practice.
3. Hebrew explanations are allowed and recommended.
4. English examples are important.
5. Keep the answer friendly, clear, and useful.
6. Do not answer general knowledge questions unless they are directly needed for learning English.
7. If the student asks about "עבר מושלם", explain Past Perfect.
8. If the student asks about "עבר פשוט", explain Past Simple.
9. If the student asks about "הווה פשוט", explain Present Simple.
10. If the student asks about "הווה מושלם", explain Present Perfect.
`;

  try {
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
    return response.text?.trim() || "אני כאן כדי לעזור לך לתרגל אנגלית. כתבי לי משפט או נושא באנגלית ונמשיך משם.";
  } catch (error) {
    console.error("Gemini conversation error:", error.message || error);
    if (isRateLimitError(error)) {
      return "כרגע יש עומס או מגבלת שימוש זמנית בחיבור ל־AI.\nבינתיים אפשר לתרגל כך:\n1. כתבי משפט אחד באנגלית.\n2. נסי לתרגם אותו לעברית.\n3. בעוד כמה דקות נסי לשלוח לי אותו שוב ואעזור לך לתקן.";
    }
    return "כרגע יש תקלה זמנית בחיבור ל־AI. נסי שוב בעוד רגע. בינתיים אפשר לכתוב לי משפט באנגלית לתרגול.";
  }
}
