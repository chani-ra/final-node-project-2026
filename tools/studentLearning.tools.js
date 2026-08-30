import { Type } from "@google/genai";

import User from "../models/users.model.js";
import CourseProgress from "../models/courseProgress.model.js";

export const getStudentQuizResultsDeclaration = {
  name: "getStudentQuizResults",

  description:
    "Gets the authenticated student's 5 most recent quiz results. Use this tool when quiz performance can help create a more personalized English study plan.",

  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const getStudentGrammarHistoryDeclaration = {
  name: "getStudentGrammarHistory",

  description:
    "Gets the authenticated student's 5 most recent grammar corrections. Use this tool when grammar mistakes, writing weaknesses, or repeated language errors can help personalize the study plan.",

  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const getStudentLearningProgressDeclaration = {
  name: "getStudentLearningProgress",

  description:
    "Gets the authenticated student's recent course learning progress. Use this tool when course progress, completed learning activities, study activity, or what the student should study next is relevant.",

  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

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

export async function getStudentGrammarHistory(userId) {
  const user = await User.findById(userId)
    .select("grammarHistory")
    .lean();

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  const recentGrammarHistory = [
    ...(user.grammarHistory || []),
  ]
    .slice(-5)
    .reverse()
    .map((item) => ({
      original: item.original || "",
      corrected: item.corrected || "",
      explanation: item.explanation || "",
      createdAt: item.createdAt || null,
    }));

  return {
    count: recentGrammarHistory.length,
    recentGrammarHistory,
  };
}


export async function getStudentLearningProgress(userId) {
  const progressList = await CourseProgress.find({
    user: userId,
  })
    .sort({ lastActivityAt: -1 })
    .limit(5)
    .populate(
      "course",
      "title category level"
    )
    .lean();

  const courses = progressList.map((item) => ({
    title: item.course?.title || "Unknown course",
    category: item.course?.category || null,
    level: item.course?.level || null,
    progressPercent: item.progressPercent || 0,
    completedLessons: item.completedLessons?.length || 0,
    completedSongs: item.completedSongs?.length || 0,
    completedExercises:
      item.completedExercises?.length || 0,
    completedQuizzes: item.completedQuizzes?.length || 0,
    lastActivityAt: item.lastActivityAt || null,
  }));

  return {
    count: courses.length,
    courses,
  };
}
export const studentLearningToolDeclarations = [
  getStudentQuizResultsDeclaration,
  getStudentGrammarHistoryDeclaration,
  getStudentLearningProgressDeclaration,
];

export const studentLearningToolHandlers = {
  getStudentQuizResults,
  getStudentGrammarHistory,
  getStudentLearningProgress,
};