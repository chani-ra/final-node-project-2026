import Lesson from '../models/lessons.model.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import TokenService from '../service/token.service.js';

const streamVideoFile = (req, res, videoPath) => {
  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ message: 'קובץ וידאו לא נמצא' });
  }

  const fileSize = fs.statSync(videoPath).size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (
      Number.isNaN(start) ||
      Number.isNaN(end) ||
      start < 0 ||
      end >= fileSize ||
      start > end
    ) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      return res.sendStatus(416);
    }

    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });

    return fs.createReadStream(videoPath, { start, end }).pipe(res);
  }

  res.writeHead(200, {
    'Content-Length': fileSize,
    'Content-Type': 'video/mp4',
  });

  return fs.createReadStream(videoPath).pipe(res);
};

export const LessonMediaController = {
  streamLesson: async (req, res) => {
    const { lessonId } = req.params;

    try {
      if (!mongoose.Types.ObjectId.isValid(lessonId)) {
        return res.status(400).json({ message: 'ID של שיעור לא תקין' });
      }

      const lesson = await Lesson.findById(lessonId);

      if (!lesson) {
        return res.status(404).json({ message: 'שיעור לא נמצא' });
      }

      if (!lesson.isPublic) {
        return res.status(403).json({ message: 'השיעור אינו ציבורי' });
      }

      const videoPath = path.join('uploads/videos', lesson.videoFileName);
      return streamVideoFile(req, res, videoPath);
    } catch (error) {
      console.error('Error streaming lesson:', error);
      return res.status(500).json({ message: 'שגיאה בהשמעת הווידאו' });
    }
  },

  // השמעת וידאו פרטי עם טוקן תצוגה מקדימה קצר-חיים
  streamManagedLesson: async (req, res) => {
    const { lessonId } = req.params;
    const { token } = req.query;

    try {
      if (!mongoose.Types.ObjectId.isValid(lessonId)) {
        return res.status(400).json({ message: 'ID של שיעור לא תקין' });
      }

      if (!token) {
        return res.status(401).json({ message: 'Preview token is required' });
      }

      const decoded = TokenService.verifyToken(token);

      if (
        decoded.type !== 'lesson-preview' ||
        decoded.lessonId?.toString() !== lessonId.toString()
      ) {
        return res.status(401).json({ message: 'Preview token is invalid' });
      }

      const lesson = await Lesson.findById(lessonId);

      if (!lesson) {
        return res.status(404).json({ message: 'שיעור לא נמצא' });
      }

      const canPreview =
        decoded.role === 'admin' ||
        lesson.instructorId.toString() === decoded.userId?.toString();

      if (!canPreview) {
        return res.status(403).json({ message: 'אין לך הרשאה לצפות בשיעור זה' });
      }

      const videoPath = path.join('uploads/videos', lesson.videoFileName);
      return streamVideoFile(req, res, videoPath);
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Preview token is invalid or expired' });
      }

      console.error('Error streaming managed lesson:', error);
      return res.status(500).json({ message: 'שגיאה בהשמעת הווידאו' });
    }
  },

};

export default LessonMediaController;
