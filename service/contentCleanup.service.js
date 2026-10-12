import Course from "../models/course.model.js";
import CourseProgress from "../models/courseProgress.model.js";
import { recalculateProgress } from "./progress.service.js";

const CONTENT_CONFIG = {
  lesson: {
    courseField: "lessons",
    progressField: "completedLessons",
  },
  exercise: {
    courseField: "exercises",
    progressField: "completedExercises",
  },
  song: {
    courseField: "songs",
    progressField: "completedSongs",
  },
  quiz: {
    courseField: "quizzes",
    progressField: "completedQuizzes",
  },
};

export const cleanupContentReferences = async (contentType, contentId) => {
  const config = CONTENT_CONFIG[contentType];

  if (!config) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }

  const { courseField, progressField } = config;

  const affectedCourses = await Course.find({
    [courseField]: contentId,
  }).select("_id");

  const courseIds = affectedCourses.map((course) => course._id);

  await Course.updateMany(
    { [courseField]: contentId },
    { $pull: { [courseField]: contentId } }
  );

  await CourseProgress.updateMany(
    { [progressField]: contentId },
    { $pull: { [progressField]: contentId } }
  );

  if (courseIds.length === 0) {
    return;
  }

  const progressRecords = await CourseProgress.find({
    course: { $in: courseIds },
  }).select("user course");

  await Promise.all(
    progressRecords.map((progress) =>
      recalculateProgress(progress.user, progress.course)
    )
  );
};