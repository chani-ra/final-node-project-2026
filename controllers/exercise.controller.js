import Exercise from "../models/exercise.model.js";

const allowedHobbies = ["art_music", "sports", "movies", "books"];
const allowedExpectations = ["grammar", "fluent_speaking", "confidence", "vocabulary"];

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

      const parsedHobbies = filterAllowedValues(
        safeJsonParseArray(hobbies),
        allowedHobbies
      );

      const parsedExpectations = filterAllowedValues(
        safeJsonParseArray(expectations),
        allowedExpectations
      );

      const newExercise = new Exercise({
        title: title.trim(),
        description: description?.trim() || "",
        instructions: instructions?.trim() || "",
        type: type || "practice",
        category: category || "general",
        level: level || "beginner",
        targetAges: buildTargetAges(targetAgeMin, targetAgeMax),
        hobbies: parsedHobbies,
        expectations: parsedExpectations,
        materials: safeJsonParseArray(materials),
        isPublic: parseBoolean(isPublic, false),
        createdBy: req.user.id,
        createdByAI: parseBoolean(createdByAI, false),
        aiPrompt: aiPrompt?.trim() || "",
      });

      await newExercise.save();

      res.status(201).json({
        success: true,
        message: "תרגיל נוצר בהצלחה",
        exercise: newExercise,
      });
    } catch (error) {
      console.error("Error creating exercise:", error);

      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // קבלת כל התרגילים הציבוריים
  getAllExercises: async (req, res) => {
    try {
      const exercises = await Exercise.find({ isPublic: true })
        .populate("createdBy", "username email role")
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: exercises.length,
        exercises,
      });
    } catch (error) {
      console.error("Error fetching exercises:", error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // קבלת תרגילים של מורה
  getExercisesByTeacher: async (req, res) => {
    try {
      const { teacherId } = req.params;

      const exercises = await Exercise.find({ createdBy: teacherId })
        .populate("createdBy", "username email role")
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: exercises.length,
        exercises,
      });
    } catch (error) {
      console.error("Error fetching teacher exercises:", error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // קבלת תרגיל לפי מזהה
  getExerciseById: async (req, res) => {
    try {
      const exercise = await Exercise.findById(req.params.exerciseId).populate(
        "createdBy",
        "username email role"
      );

      if (!exercise) {
        return res.status(404).json({
          success: false,
          message: "תרגיל לא נמצא",
        });
      }

      res.status(200).json({
        success: true,
        exercise,
      });
    } catch (error) {
      console.error("Error fetching exercise:", error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // עדכון תרגיל
  updateExercise: async (req, res) => {
    try {
      const { exerciseId } = req.params;

      const exercise = await Exercise.findById(exerciseId);

      if (!exercise) {
        return res.status(404).json({
          success: false,
          message: "תרגיל לא נמצא",
        });
      }

      if (exercise.createdBy.toString() !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "אין לך הרשאה לערוך תרגיל זה",
        });
      }

      const updateData = { ...req.body };

      if (updateData.title) updateData.title = updateData.title.trim();
      if (updateData.description) updateData.description = updateData.description.trim();
      if (updateData.instructions) updateData.instructions = updateData.instructions.trim();

      if (updateData.hobbies !== undefined) {
        updateData.hobbies = filterAllowedValues(
          safeJsonParseArray(updateData.hobbies),
          allowedHobbies
        );
      }

      if (updateData.expectations !== undefined) {
        updateData.expectations = filterAllowedValues(
          safeJsonParseArray(updateData.expectations),
          allowedExpectations
        );
      }

      if (updateData.materials !== undefined) {
        updateData.materials = safeJsonParseArray(updateData.materials);
      }

      if (
        updateData.targetAgeMin !== undefined ||
        updateData.targetAgeMax !== undefined
      ) {
        updateData.targetAges = buildTargetAges(
          updateData.targetAgeMin ?? exercise.targetAges?.min,
          updateData.targetAgeMax ?? exercise.targetAges?.max
        );

        delete updateData.targetAgeMin;
        delete updateData.targetAgeMax;
      }

      if (updateData.isPublic !== undefined) {
        updateData.isPublic = parseBoolean(updateData.isPublic, false);
      }

      if (updateData.createdByAI !== undefined) {
        updateData.createdByAI = parseBoolean(updateData.createdByAI, false);
      }

      delete updateData.createdBy;

      const updatedExercise = await Exercise.findByIdAndUpdate(
        exerciseId,
        updateData,
        { new: true, runValidators: true }
      );

      res.status(200).json({
        success: true,
        message: "תרגיל עודכן בהצלחה",
        exercise: updatedExercise,
      });
    } catch (error) {
      console.error("Error updating exercise:", error);

      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // מחיקת תרגיל
  deleteExercise: async (req, res) => {
    try {
      const { exerciseId } = req.params;

      const exercise = await Exercise.findById(exerciseId);

      if (!exercise) {
        return res.status(404).json({
          success: false,
          message: "תרגיל לא נמצא",
        });
      }

      if (exercise.createdBy.toString() !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "אין לך הרשאה למחוק תרגיל זה",
        });
      }

      await Exercise.findByIdAndDelete(exerciseId);

      res.status(200).json({
        success: true,
        message: "תרגיל נמחק בהצלחה",
      });
    } catch (error) {
      console.error("Error deleting exercise:", error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // סימון תרגיל כהושלם על ידי תלמיד
  markCompleted: async (req, res) => {
    try {
      const { exerciseId } = req.params;
      const userId = req.user.id;

      const exercise = await Exercise.findById(exerciseId);

      if (!exercise) {
        return res.status(404).json({
          success: false,
          message: "תרגיל לא נמצא",
        });
      }

      res.status(200).json({
        success: true,
        message: "תרגיל סומן כהושלם",
        exerciseId,
        userId,
        completedAt: new Date(),
      });
    } catch (error) {
      console.error("Error marking exercise completed:", error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};

export default ExerciseController;