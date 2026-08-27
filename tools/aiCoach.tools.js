import { Type } from "@google/genai";
import User from "../models/users.model.js";

// התיאור של הכלי ש-Gemini מקבל
export const getStudentQuizResultsDeclaration = {
  name: "getStudentQuizResults",

  description:
    "Gets the authenticated student's 5 most recent quiz results. Use this tool when quiz performance can help create a more personalized English study plan.",

  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

// הפונקציה האמיתית שרצה אצלנו בשרת
export async function getStudentQuizResults(userId) {
  const user = await User.findById(userId)
    .select("quizResults")
    .populate(
      "quizResults.quiz",
      "title englishLevel quizType category"
    )
    .lean();

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  const recentQuizResults = [...(user.quizResults || [])]
    .sort(
      (a, b) =>
        new Date(b.completedAt) - new Date(a.completedAt)
    )
    .slice(0, 5)
    .map((result) => ({
      title: result.quiz?.title || "Unknown quiz",
      quizType: result.quiz?.quizType || null,
      category: result.quiz?.category || null,
      level: result.quiz?.englishLevel || null,

      score: result.score,
      totalPoints: result.totalPoints,
      percentage: result.percentage,
      passed: result.passed,
      completedAt: result.completedAt,
    }));

  return {
    count: recentQuizResults.length,
    recentQuizResults,
  };
}