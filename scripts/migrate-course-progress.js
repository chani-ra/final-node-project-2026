import { config } from "dotenv";
import mongoose from "mongoose";

import { connectDB } from "../config/db.js";
import User from "../models/users.model.js";
import Course from "../models/course.model.js";
import CourseProgress from "../models/courseProgress.model.js";

import {
  recalculateProgress,
} from "../service/progress.service.js";

config();

function mergeIds(...arrays) {
  const uniqueIds = new Set();

  arrays
    .flat()
    .filter(Boolean)
    .forEach((id) => {
      uniqueIds.add(id.toString());
    });

  return [...uniqueIds];
}

function getLatestDate(...dates) {
  const validDates = dates
    .filter(Boolean)
    .map((date) => new Date(date))
    .filter(
      (date) =>
        !Number.isNaN(date.getTime())
    );

  if (validDates.length === 0) {
    return null;
  }

  return new Date(
    Math.max(
      ...validDates.map((date) =>
        date.getTime()
      )
    )
  );
}

async function migrateCourseProgress() {
  await connectDB();

  console.log(
    "Starting course progress migration..."
  );

  const users = await User.find({
    "courseProgress.0": {
      $exists: true,
    },
  })
    .select("_id username courseProgress")
    .lean();

  let usersProcessed = 0;
  let progressMigrated = 0;
  let deletedCoursesSkipped = 0;
  let invalidRecordsSkipped = 0;

  for (const user of users) {
    usersProcessed += 1;

    for (const legacyProgress of
      user.courseProgress || []) {

      if (!legacyProgress.course) {
        invalidRecordsSkipped += 1;
        continue;
      }

      const courseExists =
        await Course.exists({
          _id: legacyProgress.course,
        });

      if (!courseExists) {
        deletedCoursesSkipped += 1;
        continue;
      }

      const existingProgress =
        await CourseProgress.findOne({
          user: user._id,
          course:
            legacyProgress.course,
        });

      const completedLessons =
        mergeIds(
          existingProgress
            ?.completedLessons || [],
          legacyProgress
            .completedLessons || []
        );

      const completedSongs =
        mergeIds(
          existingProgress
            ?.completedSongs || [],
          legacyProgress
            .completedSongs || []
        );

      const completedExercises =
        mergeIds(
          existingProgress
            ?.completedExercises || [],
          legacyProgress
            .completedExercises || []
        );

      const completedQuizzes =
        mergeIds(
          existingProgress
            ?.completedQuizzes || [],
          legacyProgress
            .completedQuizzes || []
        );

      const lastActivityAt =
        getLatestDate(
          existingProgress
            ?.lastActivityAt,
          legacyProgress
            .lastAccessedAt,
          legacyProgress.startedAt
        );

      await CourseProgress.findOneAndUpdate(
        {
          user: user._id,
          course:
            legacyProgress.course,
        },

        {
          $set: {
            completedLessons,
            completedSongs,
            completedExercises,
            completedQuizzes,

            ...(lastActivityAt && {
              lastActivityAt,
            }),
          },

          $setOnInsert: {
            user: user._id,
            course:
              legacyProgress.course,
          },
        },

        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

      /*
       * מחשבים מחדש את האחוז לפי
       * התוכן האמיתי שקיים כיום בקורס.
       */
      const recalculated =
        await recalculateProgress(
          user._id,
          legacyProgress.course
        );

      /*
       * recalculateProgress מעדכן
       * lastActivityAt לעכשיו.
       *
       * Migration אינו פעילות לימודית,
       * ולכן מחזירים את זמן הפעילות
       * המקורי.
       */
      if (lastActivityAt) {
        recalculated.lastActivityAt =
          lastActivityAt;

        await recalculated.save();
      }

      progressMigrated += 1;
    }
  }

  console.log("");
  console.log(
    "Course progress migration completed."
  );

  console.log(
    `Users processed: ${usersProcessed}`
  );

  console.log(
    `Progress records migrated: ${progressMigrated}`
  );

  console.log(
    `Deleted courses skipped: ${deletedCoursesSkipped}`
  );

  console.log(
    `Invalid records skipped: ${invalidRecordsSkipped}`
  );
}

migrateCourseProgress()
  .catch((error) => {
    console.error(
      "Course progress migration failed:",
      error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });