import fs from 'fs';
import TokenService from '../service/token.service.js';
import { LessonService, LessonServiceError } from '../service/lessons.service.js';
import LessonMediaController from './lessonMedia.controller.js';

const respondWithServiceError = (error, res) => {
  if (!(error instanceof LessonServiceError)) return false;
  res.status(error.statusCode).json(error.body);
  return true;
};

const removeUploadedFile = (file, checkExists = false) => {
  if (!file) return;
  try {
    if (!checkExists || fs.existsSync(file.path)) fs.unlinkSync(file.path);
  } catch {
    // Original controllers ignore uploaded-file cleanup failures.
  }
};

export const LessonController = {
  uploadLesson: async (req, res) => {
    try {
      const result = await LessonService.uploadLesson(req.body, req.file, req.user.id);
      return res.status(201).json(result);
    } catch (error) {
      removeUploadedFile(req.file);
      if (respondWithServiceError(error, res)) return;
      console.error('[uploadLesson] Error:', error);
      return res.status(400).json({ success: false, message: error.message });
    }
  },

  getInstructorLessons: async (req, res) => {
    try {
      const result = await LessonService.getInstructorLessons(
        req.params.instructorId, req.user, req.query
      );
      return res.status(200).json(result);
    } catch (error) {
      if (respondWithServiceError(error, res)) return;
      console.error('Error fetching instructor lessons:', error);
      return res.status(500).json({ message: error.message });
    }
  },

  getManagedLessonById: async (req, res) => {
    try {
      const lesson = await LessonService.getManagedLessonById(req.params.lessonId, req.user);
      const previewToken = TokenService.generateLessonPreviewToken(
        req.user.id, lesson._id, req.user.role
      );
      return res.status(200).json({ success: true, lesson, previewToken });
    } catch (error) {
      if (respondWithServiceError(error, res)) return;
      console.error('Error fetching managed lesson:', error);
      return res.status(500).json({ message: error.message });
    }
  },

  getLessonById: async (req, res) => {
    try {
      const lesson = await LessonService.getLessonById(req.params.lessonId);
      return res.status(200).json({ success: true, lesson });
    } catch (error) {
      if (respondWithServiceError(error, res)) return;
      console.error('Error fetching lesson:', error);
      return res.status(500).json({ message: error.message });
    }
  },

  updateLesson: async (req, res) => {
    try {
      const result = await LessonService.updateLesson(
        req.params.lessonId, req.user, req.body, req.file
      );
      return res.status(200).json(result);
    } catch (error) {
      removeUploadedFile(req.file, !(error instanceof LessonServiceError));
      if (respondWithServiceError(error, res)) return;
      console.error('Error updating lesson:', error);
      return res.status(400).json({ message: error.message });
    }
  },

  deleteLesson: async (req, res, next) => {
    try {
      const result = await LessonService.deleteLesson(req.params.lessonId, req.user);
      return res.status(200).json(result);
    } catch (error) {
      if (respondWithServiceError(error, res)) return;
      next(error);
    }
  },

  // Media responses directly manipulate the HTTP stream and remain in a dedicated controller.
  streamLesson: LessonMediaController.streamLesson,
  streamManagedLesson: LessonMediaController.streamManagedLesson,

  enrollStudent: async (req, res) => {
    try {
      const result = await LessonService.enrollStudent(req.params.lessonId, req.user.id);
      return res.status(200).json(result);
    } catch (error) {
      if (respondWithServiceError(error, res)) return;
      console.error('Error enrolling student:', error);
      return res.status(500).json({
        message: 'שגיאה בהרשמה לשיעור',
        error: error.message,
      });
    }
  },

  searchLessons: async (req, res) => {
    try {
      const result = await LessonService.searchLessons(req.query);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error searching lessons:', error);
      return res.status(500).json({
        message: 'שגיאה בחיפוש שיעורים',
        error: error.message,
      });
    }
  },

  getInstructorStats: async (req, res) => {
    try {
      const result = await LessonService.getInstructorStats(req.params.instructorId, req.user);
      return res.status(200).json(result);
    } catch (error) {
      if (respondWithServiceError(error, res)) return;
      console.error('Error fetching instructor stats:', error);
      return res.status(500).json({
        message: 'שגיאה בקבלת סטטיסטיקות',
        error: error.message,
      });
    }
  },
};

export default LessonController;
