import mongoose from "mongoose";
import Exercise from "../models/exercise.model.js";
import Course from "../models/course.model.js";

import { markExerciseCompleted } from "../service/progress.service.js";

const allowedHobbies = ["art_music", "sports", "movies", "books"];
const allowedExpectations = [
  "grammar",
  "fluent_speaking",
  "confidence",
  "vocabulary",
];

const safeJsonParseArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const filterAllowedValues = (list, allowedList) => {
  if (!Array.isArray(list)) return [];
  return list.filter((item) => allowedList.includes(item));
};

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null) return defaultValue;
  return value === true || value === "true";
};

const buildTargetAges = (min, max) => {
  const minAge = Number(min) || 6;
  const maxAge = Number(max) || 120;

  return {
    min: Math.max(4, Math.min(minAge, 120)),
    max: Math.max(4, Math.min(maxAge, 120)),
  };
};

const canAccessPrivateExercise = async (exercise, user) => {
  if (user.role === "admin") return true;
  if (exercise.createdBy.toString() === user.id.toString()) return true;

  const enrolledCourse = await Course.exists({
    exercises: exercise._id,
    enrolledStudents: user.id,
  });

  return Boolean(enrolledCourse);
};

export const ExerciseController = {
  // יצירת תרגיל חדש על ידי מורה
  createExercise: async (req, res) => {
    try {
      const {
        title,
        description,
        instructions,
        type,
        materials,
        category,
        level,
        targetAgeMin,
        targetAgeMax,
        hobbies,
        expectations,
        isPublic,
        createdByAI,
        aiPrompt,
      } = req.body;

      if (!title?.trim()) {
        return res.status(400).json({
          success: false,
          message: "כותרת תרגיל חובה",
        });
      }

      const newExercise = new Exercise({
        title: title.trim(),
        description: description?.trim() || "",
        instructions: instructions?.trim() || "",
        type: type || "practice",
        category: category || "general",
        level: level || "beginner",
        targetAges: buildTargetAges(targetAgeMin, targetAgeMax),
        hobbies: filterAllowedValues(
          safeJsonParseArray(hobbies),
          allowedHobbies
        ),
        expectations: filterAllowedValues(
          safeJsonParseArray(expectations),
          allowedExpectations
        ),
        materials: safeJsonParseArray(materials),
        isPublic: parseBoolean(isPublic, false),
        createdBy: req.user.id,
        createdByAI: parseBoolean(createdByAI, false),
        aiPrompt: aiPrompt?.trim() || "",
      });

      await newExercise.save();

      return res.status(201).json({
        success: true,
        message: "תרגיל נוצר בהצלחה",
        exercise: newExercise,
      });
    } catch (error) {
      console.error("Error creating exercise:", error);

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // קבלת כל התרגילים הציבוריים
  getAllExercises: async (req, res) => {
    try {
      const exercises = await Exercise.find({ isPublic: true })
        .select("-aiPrompt")
        .populate("createdBy", "username")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: exercises.length,
        exercises,
      });
    } catch (error) {
      console.error("Error fetching exercises:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // קבלת תרגילים של מורה - מסך ניהול
  getExercisesByTeacher: async (req, res) => {
    try {
      const { teacherId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        return res.status(400).json({
          success: false,
          message: "ID של מורה לא תקין",
        });
      }

      const isOwner = teacherId.toString() === req.user.id.toString();
      const isAdmin = req.user.role === "admin";

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "אין לך הרשאה לצפות בתרגילים של מורה זו",
        });
      }

      const exercises = await Exercise.find({ createdBy: teacherId })
        .populate("createdBy", "username email role")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: exercises.length,
        exercises,
      });
    } catch (error) {
      console.error("Error fetching teacher exercises:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // קבלת תרגיל לפי מזהה
  getExerciseById: async (req, res) => {
    try {
      const { exerciseId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
        return res.status(400).json({
          success: false,
          message: "ID של תרגיל לא תקין",
        });
      }

      const exercise = await Exercise.findById(exerciseId);

      if (!exercise) {
        return res.status(404).json({
          success: false,
          message: "תרגיל לא נמצא",
        });
      }

      if (!exercise.isPublic) {
        const canAccess = await canAccessPrivateExercise(exercise, req.user);

        if (!canAccess) {
          return res.status(403).json({
            success: false,
            message: "אין לך הרשאה לצפות בתרגיל זה",
          });
        }
      }

      const isOwner =
        exercise.createdBy.toString() === req.user.id.toString();
      const isAdmin = req.user.role === "admin";

      await exercise.populate("createdBy", "username");

      const safeExercise = exercise.toObject();

      if (!isOwner && !isAdmin) {
        delete safeExercise.aiPrompt;
      }

      return res.status(200).json({
        success: true,
        exercise: safeExercise,
      });
    } catch (error) {
      console.error("Error fetching exercise:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // עדכון תרגיל
  updateExercise: async (req, res) => {
    try {
      const { exerciseId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
        return res.status(400).json({
          success: false,
          message: "ID של תרגיל לא תקין",
        });
      }

      const exercise = await Exercise.findById(exerciseId);

      if (!exercise) {
        return res.status(404).json({
          success: false,
          message: "תרגיל לא נמצא",
        });
      }

      const isOwner =
        exercise.createdBy.toString() === req.user.id.toString();
      const isAdmin = req.user.role === "admin";

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "אין לך הרשאה לערוך תרגיל זה",
        });
      }

      const {
        title,
        description,
        instructions,
        type,
        materials,
        category,
        level,
        targetAgeMin,
        targetAgeMax,
        hobbies,
        expectations,
        isPublic,
      } = req.body;

      const updateData = {};

      if (title !== undefined) updateData.title = title.trim();
      if (description !== undefined) {
        updateData.description = description.trim();
      }
      if (instructions !== undefined) {
        updateData.instructions = instructions.trim();
      }
      if (type !== undefined) updateData.type = type;
      if (category !== undefined) updateData.category = category;
      if (level !== undefined) updateData.level = level;

      if (materials !== undefined) {
        updateData.materials = safeJsonParseArray(materials);
      }

      if (hobbies !== undefined) {
        updateData.hobbies = filterAllowedValues(
          safeJsonParseArray(hobbies),
          allowedHobbies
        );
      }

      if (expectations !== undefined) {
        updateData.expectations = filterAllowedValues(
          safeJsonParseArray(expectations),
          allowedExpectations
        );
      }

      if (targetAgeMin !== undefined || targetAgeMax !== undefined) {
        updateData.targetAges = buildTargetAges(
          targetAgeMin ?? exercise.targetAges?.min,
          targetAgeMax ?? exercise.targetAges?.max
        );
      }

      if (isPublic !== undefined) {
        updateData.isPublic = parseBoolean(isPublic, exercise.isPublic);
      }

      const updatedExercise = await Exercise.findByIdAndUpdate(
        exerciseId,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

      return res.status(200).json({
        success: true,
        message: "תרגיל עודכן בהצלחה",
        exercise: updatedExercise,
      });
    } catch (error) {
      console.error("Error updating exercise:", error);

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // מחיקת תרגיל
  deleteExercise: async (req, res) => {
    try {
      const { exerciseId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
        return res.status(400).json({
          success: false,
          message: "ID של תרגיל לא תקין",
        });
      }

      const exercise = await Exercise.findById(exerciseId);

      if (!exercise) {
        return res.status(404).json({
          success: false,
          message: "תרגיל לא נמצא",
        });
      }

      const isOwner =
        exercise.createdBy.toString() === req.user.id.toString();
      const isAdmin = req.user.role === "admin";

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "אין לך הרשאה למחוק תרגיל זה",
        });
      }

      await Exercise.findByIdAndDelete(exerciseId);

      return res.status(200).json({
        success: true,
        message: "תרגיל נמחק בהצלחה",
      });
    } catch (error) {
      console.error("Error deleting exercise:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // סימון תרגיל כהושלם על ידי תלמיד
  markCompleted: async (req, res, next) => {
    try {
      const { exerciseId } = req.params;
      const { courseId } = req.body;

      if (!courseId) {
        return res.status(400).json({
          success: false,
          message: "מזהה קורס חובה",
        });
      }

      const exercise = await Exercise.findById(exerciseId);

      if (!exercise) {
        return res.status(404).json({
          success: false,
          message: "תרגיל לא נמצא",
        });
      }

      const progress = await markExerciseCompleted(
        req.user.id,
        courseId,
        exerciseId
      );

      return res.status(200).json({
        success: true,
        message: "תרגיל סומן כהושלם",
        progress,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default ExerciseController;