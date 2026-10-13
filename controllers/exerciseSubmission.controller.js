
import mongoose from "mongoose";
import Course from "../models/course.model.js";
import Exercise from "../models/exercise.model.js";
import ExerciseAttempt from "../models/exerciseAttempt.model.js";
import ExerciseAnswerKey from "../models/exerciseAnswerKey.model.js";
import { exerciseGrader } from "../service/exerciseGrading.service.js";
import { markExerciseCompleted } from "../service/progress.service.js";

function parsePrompts(instructions) {
  const text =
    typeof instructions === "string" ? instructions.trim() : "";

  if (!text) return ["קראי את התרגיל וכתבי את התשובה שלך."];

  const normalized = text
    .replace(/\r\n?/g, "\n")
    .replace(/\n\s*-{3,}\s*(?=\n|$)/g, "\n")
    .replace(
      /(^|[\s])((?:\d{1,2}|[א-ת])[.)])\s+(?=\S)/gm,
      (_, prefix, number) => "\n" + number + " "
    );

  const prompts = [];

  for (const raw of normalized.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    const match = line.match(/^(?:\d{1,2}|[א-ת])[.)]\s+(.+)$/);

    if (match) {
      prompts.push(match[1]);
    } else if (prompts.length) {
      prompts[prompts.length - 1] += "\n" + line;
    }
  }

  return prompts.length ? prompts : [text];
}

function error(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

async function authorized(req) {
  const { exerciseId } = req.params;
  const courseId = req.body?.courseId || req.query?.courseId;

  if (
    !mongoose.isValidObjectId(exerciseId) ||
    !mongoose.isValidObjectId(courseId)
  ) {
    throw error(400, "מזהי תרגיל וקורס תקינים נדרשים");
  }

  const course = await Course.findById(courseId)
    .select("exercises enrolledStudents createdFor")
    .lean();

  if (!course) throw error(404, "הקורס לא נמצא");

  const id = String(req.user.id);
  const access =
    String(course.createdFor || "") === id ||
    (course.enrolledStudents || []).some((v) => String(v) === id);

  if (!access) throw error(403, "אין הרשאה לקורס זה");

  if (
    !(course.exercises || []).some((v) => String(v) === exerciseId)
  ) {
    throw error(400, "התרגיל אינו חלק מהקורס");
  }

  const exercise = await Exercise.findById(exerciseId).lean();
  if (!exercise) throw error(404, "התרגיל לא נמצא");

  return { exercise, courseId };
}

function responseBody(attempt) {
  return {
    id: attempt.id,
    status: attempt.status,
    score: attempt.score,
    answers: attempt.answers,
    submittedAt: attempt.createdAt,
  };
}

export const exerciseSubmissionController = {
  latest: async (req, res, next) => {
    try {
      const { courseId } = await authorized(req);

      const attempt = await ExerciseAttempt.findOne({
        user: req.user.id,
        course: courseId,
        exercise: req.params.exerciseId,
      }).sort({ createdAt: -1, _id: -1 });

      res.json({
        success: true,
        attempt: attempt ? responseBody(attempt) : null,
      });
    } catch (e) {
      next(e);
    }
  },

  submit: async (req, res, next) => {
    try {
      const { exercise, courseId } = await authorized(req);
      const alreadySubmitted = await ExerciseAttempt.exists({
        user: req.user.id,
        course: courseId,
        exercise: exercise._id,
      });

      if (alreadySubmitted) {
        return res.status(409).json({
          message: "התרגיל כבר הוגש ולא ניתן להגיש שוב",
        });
      }

      const prompts = exercise.questions?.length
        ? exercise.questions
        : parsePrompts(exercise.instructions);
      const inputs = req.body?.answers;

      if (
        prompts.length > 25 ||
        !Array.isArray(inputs) ||
        inputs.length !== prompts.length ||
        inputs.some(
          (a) =>
            typeof a !== "string" ||
            !a.trim() ||
            a.length > 3000
        )
      ) {
        throw error(
          400,
          "חובה להשיב על כל השאלות (עד 3000 תווים לתשובה)"
        );
      }

      const answers = inputs.map((answer, index) => ({
        question: prompts[index],
        answer: answer.trim(),
        correct: null,
        feedback: "",
      }));

      const attempt = await ExerciseAttempt.create({
        user: req.user.id,
        course: courseId,
        exercise: exercise._id,
        answers,
        status: "pending",
      });

      try {
        const savedKey = await ExerciseAnswerKey.findOne({
          exercise: exercise._id,
        }).lean();

        let graded;

        if (savedKey?.entries?.length === prompts.length) {
          const normalize = (text) =>
            String(text)
              .normalize("NFKC")
              .trim()
              .toLowerCase()
              .replace(/[.!?]+$/g, "")
              .replace(/\s+/g, " ");

          graded = savedKey.entries.map((entry, index) => {
            const accepted = entry.answer
              .split("|")
              .map(normalize);

            const correct = accepted.includes(
              normalize(inputs[index])
            )
              ? true
              : entry.mode === "flexible"
                ? null
                : false;

            attempt.answers[index].correctAnswer =
              entry.answer;

            return {
              correct,
              feedback:
                entry.explanation ||
                (correct === true
                  ? "נכון!"
                  : "בדקי את תשובת הדוגמה."),
            };
          });
        } else {
          graded = await exerciseGrader.grade(
            exercise,
            prompts,
            inputs.map((answer) => answer.trim())
          );
        }

        if (graded) {
          attempt.answers.forEach((item, i) => {
            item.correct = graded[i].correct;
            item.feedback = graded[i].feedback;
          });

          const allGradable = graded.every(
            (item) => item.correct !== null
          );

          attempt.status = allGradable
            ? "graded"
            : "needs_review";

          if (allGradable) {
            attempt.score = Math.round(
              100 *
                graded.filter((item) => item.correct).length /
                graded.length
            );
          }

          await attempt.save();

          if (allGradable) {
            await markExerciseCompleted(
              req.user.id,
              courseId,
              exercise._id
            );
          }
        }
      } catch (e) {
        console.error("Exercise grading unavailable:", e.message);
      }

      res.status(200).json({
        success: true,
        attempt: responseBody(attempt),
        message:
          attempt.status === "graded"
            ? "התשובות נבדקו ונשמרו"
            : "התשובות נשמרו; הבדיקה עדיין לא הושלמה",
      });
    } catch (e) {
      next(e);
    }
  },
};
