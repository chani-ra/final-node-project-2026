import Course from "../models/course.model.js";
import CourseProgress from "../models/courseProgress.model.js";

const ITEM_CONFIG = {
  lesson: {
    progressField: "completedLessons",
    courseField: "lessons",
  },

  song: {
    progressField: "completedSongs",
    courseField: "songs",
  },

  exercise: {
    progressField: "completedExercises",
    courseField: "exercises",
  },

  quiz: {
    progressField: "completedQuizzes",
    courseField: "quizzes",
  },
};

function createError(status, message) {
  const error = new Error(message);
  error.status = status;

  return error;
}

function normalizeIds(items = []) {
  return items.map((item) =>
    item.toString()
  );
}

function countCompletedItems(
  completedItems = [],
  courseItems = []
) {
  const courseIds = new Set(
    normalizeIds(courseItems)
  );

  return completedItems.filter((item) =>
    courseIds.has(item.toString())
  ).length;
}

function calculateProgressPercent({
  progress,
  course,
}) {
  const totalItems =
    course.lessons.length +
    course.songs.length +
    course.exercises.length +
    course.quizzes.length;

  if (totalItems === 0) {
    return 0;
  }

  const completedItems =
    countCompletedItems(
      progress.completedLessons,
      course.lessons
    ) +
    countCompletedItems(
      progress.completedSongs,
      course.songs
    ) +
    countCompletedItems(
      progress.completedExercises,
      course.exercises
    ) +
    countCompletedItems(
      progress.completedQuizzes,
      course.quizzes
    );

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (completedItems / totalItems) * 100
      )
    )
  );
}

async function getCourseOrThrow(courseId) {
  const course = await Course.findById(
    courseId
  )
    .select(
      "lessons songs exercises quizzes"
    )
    .lean();

  if (!course) {
    throw createError(
      404,
      "הקורס לא נמצא"
    );
  }

  return {
    ...course,

    lessons:
      course.lessons || [],

    songs:
      course.songs || [],

    exercises:
      course.exercises || [],

    quizzes:
      course.quizzes || [],
  };
}

async function findOrCreateProgress(
  userId,
  courseId
) {
  try {
    return await CourseProgress.findOneAndUpdate(
      {
        user: userId,
        course: courseId,
      },

      {
        $setOnInsert: {
          user: userId,
          course: courseId,

          completedLessons: [],
          completedSongs: [],
          completedExercises: [],
          completedQuizzes: [],

          progressPercent: 0,

          lastActivityAt:
            new Date(),
        },
      },

      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
  } catch (error) {
    if (error?.code === 11000) {
      const existingProgress =
        await CourseProgress.findOne({
          user: userId,
          course: courseId,
        });

      if (existingProgress) {
        return existingProgress;
      }
    }

    throw error;
  }
}

export async function getCourseProgress(
  userId,
  courseId
) {
  await getCourseOrThrow(courseId);

  const progress =
    await CourseProgress.findOne({
      user: userId,
      course: courseId,
    }).lean();

  if (progress) {
    return progress;
  }

  return {
    course: courseId,
    completedLessons: [],
    completedSongs: [],
    completedExercises: [],
    completedQuizzes: [],
    progressPercent: 0,
  };
}

export async function getCoursesProgressSummary(
  userId
) {
  const progressList =
    await CourseProgress.find({
      user: userId,
    })
      .sort({
        lastActivityAt: -1,
      })
      .lean();

  const totalCourses =
    progressList.length;

  const averageProgress =
    totalCourses > 0
      ? Math.round(
          progressList.reduce(
            (sum, item) =>
              sum +
              (item.progressPercent || 0),
            0
          ) / totalCourses
        )
      : 0;

  const completedCourses =
    progressList.filter(
      (item) =>
        item.progressPercent >= 100
    ).length;

  return {
    totalCourses,
    completedCourses,
    averageProgress,
    progressList,
  };
}

export async function getOrCreateProgress(
  userId,
  courseId
) {
  await getCourseOrThrow(courseId);

  return findOrCreateProgress(
    userId,
    courseId
  );
}

export async function recalculateProgress(
  userId,
  courseId
) {
  const course =
    await getCourseOrThrow(courseId);

  const progress =
    await findOrCreateProgress(
      userId,
      courseId
    );

  progress.progressPercent =
    calculateProgressPercent({
      progress,
      course,
    });

  progress.lastActivityAt =
    new Date();

  await progress.save();

  return progress;
}

export async function setCourseItemCompletion({
  userId,
  courseId,
  itemType,
  itemId,
  completed = true,
}) {
  const config =
    ITEM_CONFIG[itemType];

  if (!config) {
    throw createError(
      400,
      "סוג פריט לא תקין"
    );
  }

  if (!itemId) {
    throw createError(
      400,
      "חסר itemId"
    );
  }

  const course =
    await getCourseOrThrow(courseId);

  const courseItemIds =
    normalizeIds(
      course[config.courseField]
    );

  const normalizedItemId =
    itemId.toString();

  if (
    !courseItemIds.includes(
      normalizedItemId
    )
  ) {
    throw createError(
      400,
      "הפריט אינו שייך לקורס"
    );
  }

  const progress =
    await findOrCreateProgress(
      userId,
      courseId
    );

  const progressField =
    config.progressField;

  const currentIds =
    normalizeIds(
      progress[progressField]
    );

  const alreadyCompleted =
    currentIds.includes(
      normalizedItemId
    );

  if (
    completed &&
    !alreadyCompleted
  ) {
    progress[progressField].push(
      itemId
    );
  }

  if (
    !completed &&
    alreadyCompleted
  ) {
    progress[progressField] =
      progress[
        progressField
      ].filter(
        (id) =>
          id.toString() !==
          normalizedItemId
      );
  }

  progress.progressPercent =
    calculateProgressPercent({
      progress,
      course,
    });

  progress.lastActivityAt =
    new Date();

  await progress.save();

  return progress;
}

export function markLessonCompleted(
  userId,
  courseId,
  lessonId
) {
  return setCourseItemCompletion({
    userId,
    courseId,
    itemType: "lesson",
    itemId: lessonId,
    completed: true,
  });
}

export function markExerciseCompleted(
  userId,
  courseId,
  exerciseId
) {
  return setCourseItemCompletion({
    userId,
    courseId,
    itemType: "exercise",
    itemId: exerciseId,
    completed: true,
  });
}

export function markSongCompleted(
  userId,
  courseId,
  songId
) {
  return setCourseItemCompletion({
    userId,
    courseId,
    itemType: "song",
    itemId: songId,
    completed: true,
  });
}

export function markQuizCompleted(
  userId,
  courseId,
  quizId
) {
  return setCourseItemCompletion({
    userId,
    courseId,
    itemType: "quiz",
    itemId: quizId,
    completed: true,
  });
}

export async function getUserProgressList(userId) {
  return CourseProgress.find({
    user: userId,
  })
    .populate(
      "course",
      "title category level"
    )
    .sort({
      lastActivityAt: -1,
    })
    .lean();
}