import { Router } from 'express';
import ExerciseController from '../controllers/exercise.controller.js';
import { authenticateToken, requireTeacher } from '../middlewares/auth.middleware.js';

const router = Router();

// ➕ יצירת תרגיל (רק מורים)
router.post('/create', authenticateToken, requireTeacher, ExerciseController.createExercise);

// 📖 קבלת כל התרגילים
router.get('/', ExerciseController.getAllExercises);

// 📖 קבלת תרגיל ספציפי
router.get('/:exerciseId', ExerciseController.getExerciseById);

// ✏️ עדכון תרגיל (רק מורים)
router.put('/:exerciseId', authenticateToken, requireTeacher, ExerciseController.updateExercise);

// 🗑️ מחיקת תרגיל (רק מורים)
router.delete('/:exerciseId', authenticateToken, requireTeacher, ExerciseController.deleteExercise);

// ✅ סימון תרגיל כהושלם (תלמידים)
router.post('/:exerciseId/complete', authenticateToken, ExerciseController.markCompleted);

export default router;