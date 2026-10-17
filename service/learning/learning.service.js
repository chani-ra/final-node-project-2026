import User from "../../models/users.model.js";
import LearningCategory from "../../models/learningCategory.model.js";
import LearningSubcategory from "../../models/learningSubcategory.model.js";
import LearningPrompt from "../../models/learningPrompt.model.js";
import { generateWithProvider } from "./providers/index.js";
import { lessonInstructions } from "./providers/lessonInstructions.js";

function httpError(status, message) {
  const error = new Error(message);
  error.statusCode = status;
  return error;
}

export async function generateLearningLesson(
  { userId, categoryId, subcategoryId, prompt, provider = "gemini" },
  { generate = generateWithProvider } = {}
) {
  const [category, subcategory, user] = await Promise.all([
    LearningCategory.findById(categoryId).lean(),
    LearningSubcategory.findOne({ _id: subcategoryId, category: categoryId }).lean(),
    User.findById(userId).select("englishLevel").lean(),
  ]);

  if (!category || !subcategory) {
    throw httpError(400, "הקטגוריה ותת-הקטגוריה שנבחרו אינן תואמות");
  }
  if (!user) throw httpError(401, "המשתמש לא נמצא");
  const level = user.englishLevel || "beginner";
  let result;
  try {
    result = await generate({
      provider,
      instructions: lessonInstructions({ category: category.name, subcategory: subcategory.name, level }),
      prompt,
    });
  } catch (error) {
    if (error.statusCode) throw error;
    console.error("Learning lesson generation failed:", error.message);
    throw httpError(503, "יצירת השיעור אינה זמינה כרגע. נסי שוב מאוחר יותר");
  }

  if (!result.response) throw httpError(503, "לא התקבלה תשובה מהמודל. נסי שוב");

  return LearningPrompt.create({
    user: userId,
    category: categoryId,
    subcategory: subcategoryId,
    prompt,
    response: result.response.slice(0, 20000),
    level,
    provider: result.provider,
    model: result.model,
  });
}

export async function getLearningHistory({ userId, categoryId, page, limit }) {
  const filter = {};
  if (userId) filter.user = userId;
  if (categoryId) filter.category = categoryId;
  const [items, total] = await Promise.all([
    LearningPrompt.find(filter)
      .select("user category subcategory prompt response level provider model createdAt")
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "username email")
      .populate("category", "name slug")
      .populate("subcategory", "name slug")
      .lean(),
    LearningPrompt.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}
