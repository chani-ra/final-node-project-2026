import Exercise from '../models/exercise.model.js';

export const ExerciseController = {
  // ➕ יצירת תרגיל חדש
  createExercise: async (req, res) => {
    try {
      const { title, description, instructions, type, materials } = req.body;

      if (!title) {
        return res.status(400).json({
          message: 'כותרת תרגיל חובה'
        });
      }

      const newExercise = new Exercise({
        title: title.trim(),
        description: description?.trim() || '',
        instructions: instructions?.trim() || '',
        type: type || 'practice',
        materials: materials || [],
      });

      await newExercise.save();

      res.status(201).json({
        message: 'תרגיל נוצר בהצלחה',
        exercise: newExercise
      });

    } catch (error) {
      console.error('Error creating exercise:', error);
      res.status(400).json({ message: error.message });
    }
  },

  // 📖 קבלת כל התרגילים
  getAllExercises: async (req, res) => {
    try {
      const exercises = await Exercise.find().sort({ createdAt: -1 });
      res.status(200).json(exercises);
    } catch (error) {
      console.error('Error fetching exercises:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // 📖 קבלת תרגיל ספציפי
  getExerciseById: async (req, res) => {
    try {
      const exercise = await Exercise.findById(req.params.exerciseId);

      if (!exercise) {
        return res.status(404).json({
          message: 'תרגיל לא נמצא'
        });
      }

      res.status(200).json({
        success: true,
        exercise
      });
    } catch (error) {
      console.error('Error fetching exercise:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // ✏️ עדכון תרגיל
  updateExercise: async (req, res) => {
    try {
      const updatedExercise = await Exercise.findByIdAndUpdate(
        req.params.exerciseId,
        { ...req.body, updatedAt: Date.now() },
        { new: true }
      );

      if (!updatedExercise) {
        return res.status(404).json({ message: 'תרגיל לא נמצא' });
      }

      res.status(200).json({
        message: 'תרגיל עודכן בהצלחה',
        exercise: updatedExercise
      });

    } catch (error) {
      console.error('Error updating exercise:', error);
      res.status(400).json({ message: error.message });
    }
  },

  // 🗑️ מחיקת תרגיל
  deleteExercise: async (req, res) => {
    try {
      const deletedExercise = await Exercise.findByIdAndDelete(req.params.exerciseId);

      if (!deletedExercise) {
        return res.status(404).json({ message: 'תרגיל לא נמצא' });
      }

      res.status(200).json({
        message: 'תרגיל נמחק בהצלחה'
      });

    } catch (error) {
      console.error('Error deleting exercise:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // ✅ סימון תרגיל כהושלם (לתלמיד)
  markCompleted: async (req, res) => {
    try {
      const { exerciseId } = req.params;
      const userId = req.user.id;

      // כאן נוכל להוסיף לוגיקה לשמירת התקדמות
      // בינתיים רק נחזיר אישור

      res.status(200).json({
        message: 'תרגיל סומן כהושלם',
        exerciseId,
        userId,
        completedAt: new Date()
      });

    } catch (error) {
      console.error('Error marking exercise completed:', error);
      res.status(500).json({ message: error.message });
    }
  }
};

export default ExerciseController;