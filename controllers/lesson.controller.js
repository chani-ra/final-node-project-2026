import Lesson from '../models/lessons.model.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

import { cleanupContentReferences } from '../service/contentCleanup.service.js';
import TokenService from '../service/token.service.js';

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

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null) return defaultValue;
  return value === true || value === 'true';
};

const buildTargetAges = (min, max) => ({
  min: Number(min) || 6,
  max: Number(max) || 120,
});

const canManageLesson = (lesson, user) => {
  if (user.role === 'admin') return true;
  if (user.role !== 'teacher') return false;

  const instructorId = lesson.instructorId?._id ?? lesson.instructorId;
  return instructorId?.toString() === user.id?.toString();
};

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

export const LessonController = {
  // העלאת שיעור חדש
  uploadLesson: async (req, res) => {
    try {
      const {
        title,
        description,
        isPublic,
        lessonLanguage,
        topic,
        icon,
        category,
        level,
        targetAgeMin,
        targetAgeMax,
        hobbies,
        expectations,
      } = req.body;

      if (!title?.trim()) {
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
          } catch {
            // ignore cleanup errors
          }
        }

        return res.status(400).json({
          success: false,
          message: 'כותרת שיעור היא חובה',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'קובץ וידאו חובה',
        });
      }

      const newLessonData = {
        instructorId: req.user.id,
        title: title.trim(),
        topic: topic?.trim() || '',
        icon: icon || '🧠',
        description: description?.trim() || '',
        videoFileName: req.file.filename,
        videoFileSize: req.file.size,
        videoUrl: `/uploads/videos/${req.file.filename}`,
        uploadStatus: 'completed',
        lessonLanguage: lessonLanguage || 'he',
        isPublic: parseBoolean(isPublic, true),
        category: category || 'general',
        level: level || 'beginner',
        targetAges: buildTargetAges(targetAgeMin, targetAgeMax),
        hobbies: safeJsonParseArray(hobbies),
        expectations: safeJsonParseArray(expectations),
      };

      const newLesson = new Lesson(newLessonData);
      await newLesson.save();
      await newLesson.populate('instructorId', 'username email');

      return res.status(201).json({
        success: true,
        message: 'שיעור הועלה בהצלחה',
        lesson: newLesson,
      });
    } catch (error) {
      console.error('[uploadLesson] Error:', error);

      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          // ignore cleanup errors
        }
      }

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // קבלת כל השיעורים של מורה
  getInstructorLessons: async (req, res) => {
    const { instructorId } = req.params;

    try {
      if (!mongoose.Types.ObjectId.isValid(instructorId)) {
        return res.status(400).json({
          success: false,
          message: 'ID של מורה לא תקין',
        });
      }

      const isOwner = instructorId.toString() === req.user.id.toString();
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'אין לך הרשאה לצפות בשיעורי מורה זו',
        });
      }

      const { sortBy = 'createdAt', order = 'desc', limit = 10, page = 1 } = req.query;
      const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
      const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
      const allowedSortFields = ['createdAt', 'title', 'views', 'level'];
      const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const skip = (pageNumber - 1) * limitNumber;
      const sortObj = { [safeSortBy]: order === 'asc' ? 1 : -1 };

      const [lessons, totalLessons] = await Promise.all([
        Lesson.find({ instructorId })
          .sort(sortObj)
          .limit(limitNumber)
          .skip(skip)
          .populate('instructorId', 'username email'),
        Lesson.countDocuments({ instructorId }),
      ]);

      return res.status(200).json({
        success: true,
        count: lessons.length,
        total: totalLessons,
        pages: Math.ceil(totalLessons / limitNumber),
        currentPage: pageNumber,
        lessons,
      });
    } catch (error) {
      console.error('Error fetching instructor lessons:', error);
      return res.status(500).json({ message: error.message });
    }
  },

  // קבלת שיעור לניהול/תצוגה מקדימה של מורה או מנהל
  getManagedLessonById: async (req, res) => {
    const { lessonId } = req.params;

    try {
      if (!mongoose.Types.ObjectId.isValid(lessonId)) {
        return res.status(400).json({ message: 'ID של שיעור לא תקין' });
      }

      const lesson = await Lesson.findById(lessonId)
        .select('-enrolledStudents')
        .populate('instructorId', 'username');

      if (!lesson) {
        return res.status(404).json({ message: 'שיעור לא נמצא' });
      }

      if (!canManageLesson(lesson, req.user)) {
        return res.status(403).json({ message: 'אין לך הרשאה לצפות בשיעור זה' });
      }

      const previewToken = TokenService.generateLessonPreviewToken(
        req.user.id,
        lesson._id,
        req.user.role
      );

      return res.status(200).json({
        success: true,
        lesson,
        previewToken,
      });
    } catch (error) {
      console.error('Error fetching managed lesson:', error);
      return res.status(500).json({ message: error.message });
    }
  },

  // קבלת שיעור ציבורי ספציפי
  getLessonById: async (req, res) => {
    const { lessonId } = req.params;

    try {
      if (!mongoose.Types.ObjectId.isValid(lessonId)) {
        return res.status(400).json({ message: 'ID של שיעור לא תקין' });
      }

      const lesson = await Lesson.findById(lessonId)
        .select('-enrolledStudents')
        .populate('instructorId', 'username');

      if (!lesson) {
        return res.status(404).json({ message: 'שיעור לא נמצא' });
      }

      if (!lesson.isPublic) {
        return res.status(403).json({ message: 'השיעור אינו ציבורי' });
      }

      lesson.views += 1;
      await lesson.save();

      return res.status(200).json({
        success: true,
        lesson,
      });
    } catch (error) {
      console.error('Error fetching lesson:', error);
      return res.status(500).json({ message: error.message });
    }
  },

  // עדכון שיעור
  updateLesson: async (req, res) => {
    const { lessonId } = req.params;

    try {
      if (!mongoose.Types.ObjectId.isValid(lessonId)) {
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
          } catch {
            // ignore cleanup errors
          }
        }

        return res.status(400).json({ message: 'ID של שיעור לא תקין' });
      }

      const oldLesson = await Lesson.findById(lessonId);

      if (!oldLesson) {
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
          } catch {
            // ignore cleanup errors
          }
        }

        return res.status(404).json({ message: 'שיעור לא נמצא' });
      }

      const isOwner = oldLesson.instructorId.toString() === req.user.id.toString();
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
          } catch {
            // ignore cleanup errors
          }
        }

        return res.status(403).json({
          message: 'אין לך הרשאה לערוך שיעור זה',
        });
      }

      const {
        title,
        description,
        isPublic,
        lessonLanguage,
        topic,
        icon,
        category,
        level,
        targetAgeMin,
        targetAgeMax,
        hobbies,
        expectations,
      } = req.body;

      const updatedLessonData = {};

      if (title !== undefined) updatedLessonData.title = title.trim();
      if (description !== undefined) updatedLessonData.description = description.trim();
      if (topic !== undefined) updatedLessonData.topic = topic.trim();
      if (icon !== undefined) updatedLessonData.icon = icon;
      if (category !== undefined) updatedLessonData.category = category;
      if (level !== undefined) updatedLessonData.level = level;
      if (lessonLanguage !== undefined) updatedLessonData.lessonLanguage = lessonLanguage;

      if (isPublic !== undefined) {
        updatedLessonData.isPublic = parseBoolean(isPublic, oldLesson.isPublic);
      }

      if (hobbies !== undefined) {
        updatedLessonData.hobbies = safeJsonParseArray(hobbies);
      }

      if (expectations !== undefined) {
        updatedLessonData.expectations = safeJsonParseArray(expectations);
      }

      if (targetAgeMin !== undefined || targetAgeMax !== undefined) {
        updatedLessonData.targetAges = {
          min: targetAgeMin !== undefined
            ? Number(targetAgeMin)
            : oldLesson.targetAges?.min || 6,
          max: targetAgeMax !== undefined
            ? Number(targetAgeMax)
            : oldLesson.targetAges?.max || 120,
        };
      }

      if (req.file) {
        updatedLessonData.videoFileName = req.file.filename;
        updatedLessonData.videoUrl = `/uploads/videos/${req.file.filename}`;
        updatedLessonData.videoFileSize = req.file.size;
      }

      const updatedLesson = await Lesson.findByIdAndUpdate(
        lessonId,
        updatedLessonData,
        {
          new: true,
          runValidators: true,
        }
      );

      if (req.file && oldLesson.videoFileName) {
        const oldFilePath = path.join('uploads/videos', oldLesson.videoFileName);

        try {
          if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
        } catch (fileError) {
          console.warn('Failed to remove old lesson video:', fileError.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'שיעור עודכן בהצלחה',
        lesson: updatedLesson,
      });
    } catch (error) {
      console.error('Error updating lesson:', error);

      if (req.file) {
        try {
          if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        } catch {
          // ignore cleanup errors
        }
      }

      return res.status(400).json({ message: error.message });
    }
  },

  // מחיקת שיעור
  deleteLesson: async (req, res, next) => {
    const { lessonId } = req.params;

    try {
      if (!mongoose.Types.ObjectId.isValid(lessonId)) {
        return res.status(400).json({
          success: false,
          message: 'ID של שיעור לא תקין',
        });
      }

      const lesson = await Lesson.findById(lessonId);

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'שיעור לא נמצא',
        });
      }

      const isOwner = lesson.instructorId.toString() === req.user.id.toString();
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'אין לך הרשאה למחוק שיעור זה',
        });
      }

      await cleanupContentReferences('lesson', lesson._id);
      await Lesson.findByIdAndDelete(lesson._id);

      if (lesson.videoFileName) {
        const filePath = path.join('uploads/videos', lesson.videoFileName);

        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (fileError) {
          console.warn('Failed to remove lesson video:', fileError.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'שיעור נמחק בהצלחה',
      });
    } catch (error) {
      next(error);
    }
  },

  // השמעת וידאו של שיעור ציבורי
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


  // הרשמת סטודנט לשיעור
  enrollStudent: async (req, res) => {
    const { lessonId } = req.params;
    const studentId = req.user.id;

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

      const alreadyEnrolled = lesson.enrolledStudents.some(
        (id) => id.toString() === studentId.toString()
      );

      if (alreadyEnrolled) {
        return res.status(400).json({
          message: 'אתה כבר רשום לשיעור זה',
        });
      }

      lesson.enrolledStudents.push(studentId);
      await lesson.save();

      return res.status(200).json({
        success: true,
        message: 'נרשמת לשיעור בהצלחה',
      });
    } catch (error) {
      console.error('Error enrolling student:', error);

      return res.status(500).json({
        message: 'שגיאה בהרשמה לשיעור',
        error: error.message,
      });
    }
  },

  // חיפוש שיעורים ציבוריים
  searchLessons: async (req, res) => {
    const {
      search,
      language,
      category,
      level,
      limit = 10,
      page = 1,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    try {
      const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
      const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
      const skip = (pageNumber - 1) * limitNumber;
      const allowedSortFields = ['createdAt', 'title', 'views', 'level'];
      const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const query = { isPublic: true };

      if (search?.trim()) {
        const searchText = search.trim();

        query.$or = [
          { title: { $regex: searchText, $options: 'i' } },
          { description: { $regex: searchText, $options: 'i' } },
          { topic: { $regex: searchText, $options: 'i' } },
        ];
      }

      if (language) query.lessonLanguage = language;
      if (category) query.category = category;
      if (level) query.level = level;

      const sortObj = { [safeSortBy]: order === 'asc' ? 1 : -1 };

      const [lessons, total] = await Promise.all([
        Lesson.find(query)
          .select(
            'title topic description icon category level targetAges hobbies expectations lessonLanguage views instructorId createdAt'
          )
          .sort(sortObj)
          .limit(limitNumber)
          .skip(skip)
          .populate('instructorId', 'username')
          .lean(),
        Lesson.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        count: lessons.length,
        total,
        pages: Math.ceil(total / limitNumber),
        currentPage: pageNumber,
        lessons,
      });
    } catch (error) {
      console.error('Error searching lessons:', error);

      return res.status(500).json({
        message: 'שגיאה בחיפוש שיעורים',
        error: error.message,
      });
    }
  },

  // סטטיסטיקות מורה
  getInstructorStats: async (req, res) => {
    const { instructorId } = req.params;

    try {
      if (!mongoose.Types.ObjectId.isValid(instructorId)) {
        return res.status(400).json({
          success: false,
          message: 'ID של מורה לא תקין',
        });
      }

      const isOwner = instructorId.toString() === req.user.id.toString();
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'אין לך הרשאה לצפות בסטטיסטיקות אלו',
        });
      }

      const instructorObjectId = new mongoose.Types.ObjectId(instructorId);

      const [totalLessons, stats] = await Promise.all([
        Lesson.countDocuments({ instructorId }),
        Lesson.aggregate([
          { $match: { instructorId: instructorObjectId } },
          {
            $group: {
              _id: null,
              totalViews: { $sum: '$views' },
              totalStudents: { $sum: { $size: '$enrolledStudents' } },
              averageEnrollment: { $avg: { $size: '$enrolledStudents' } },
            },
          },
        ]),
      ]);

      return res.status(200).json({
        success: true,
        stats: {
          totalLessons,
          totalViews: stats[0]?.totalViews || 0,
          totalStudents: stats[0]?.totalStudents || 0,
          averageEnrollment: Math.round(stats[0]?.averageEnrollment || 0),
        },
      });
    } catch (error) {
      console.error('Error fetching instructor stats:', error);

      return res.status(500).json({
        message: 'שגיאה בקבלת סטטיסטיקות',
        error: error.message,
      });
    }
  },
};

export default LessonController;