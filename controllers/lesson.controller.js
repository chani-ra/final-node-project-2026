import Lesson from '../models/lessons.model.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

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

export const LessonController = {
  // ➕ העלאת שיעור חדש
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

      if (!title) {
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
          } catch {
            // ignore
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

        // שדות התאמה ל-AI
        category: category || 'general',
        level: level || 'beginner',
        targetAges: buildTargetAges(targetAgeMin, targetAgeMax),
        hobbies: safeJsonParseArray(hobbies),
        expectations: safeJsonParseArray(expectations),
      };

      const newLesson = new Lesson(newLessonData);
      await newLesson.save();
      await newLesson.populate('instructorId', 'username email');

      res.status(201).json({
        success: true,
        message: 'שיעור הועלה בהצלחה',
        lesson: newLesson,
      });
    } catch (error) {
      console.error('❌ [uploadLesson] Error:', error);

      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          // ignore
        }
      }

      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // 📖 קבלת כל השיעורים של מורה
  getInstructorLessons: async (req, res) => {
    const { instructorId } = req.params;
    const {
      sortBy = 'createdAt',
      order = 'desc',
      limit = 10,
      page = 1,
    } = req.query;

    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sortObj = { [sortBy]: order === 'desc' ? -1 : 1 };

      const lessons = await Lesson.find({ instructorId })
        .sort(sortObj)
        .limit(parseInt(limit))
        .skip(skip)
        .populate('instructorId', 'username email');

      const totalLessons = await Lesson.countDocuments({ instructorId });

      res.status(200).json({
        success: true,
        count: lessons.length,
        total: totalLessons,
        pages: Math.ceil(totalLessons / parseInt(limit)),
        currentPage: parseInt(page),
        lessons,
      });
    } catch (error) {
      console.error('Error fetching instructor lessons:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // 📖 קבלת שיעור ספציפי
  getLessonById: async (req, res) => {
    const { lessonId } = req.params;

    try {
      const lesson = await Lesson.findById(lessonId)
        .populate('instructorId', 'username email')
        .populate('enrolledStudents', 'username email');

      if (!lesson) {
        return res.status(404).json({ message: 'שיעור לא נמצא' });
      }

      lesson.views += 1;
      await lesson.save();

      res.status(200).json({
        success: true,
        lesson,
      });
    } catch (error) {
      console.error('Error fetching lesson:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // ✏️ עדכון שיעור
  updateLesson: async (req, res) => {
    const { lessonId } = req.params;

    try {
      const oldLesson = await Lesson.findById(lessonId);

      if (!oldLesson) {
        return res.status(404).json({ message: 'שיעור לא נמצא' });
      }

      if (oldLesson.instructorId.toString() !== req.user.id) {
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
          } catch {
            // ignore
          }
        }

        return res.status(403).json({
          message: 'אתה לא מורשה לערוך שיעור זה',
        });
      }

      const updatedLessonData = { ...req.body };

      if (updatedLessonData.hobbies) {
        updatedLessonData.hobbies = safeJsonParseArray(updatedLessonData.hobbies);
      }

      if (updatedLessonData.expectations) {
        updatedLessonData.expectations = safeJsonParseArray(updatedLessonData.expectations);
      }

      if (updatedLessonData.targetAgeMin || updatedLessonData.targetAgeMax) {
        updatedLessonData.targetAges = buildTargetAges(
          updatedLessonData.targetAgeMin,
          updatedLessonData.targetAgeMax
        );

        delete updatedLessonData.targetAgeMin;
        delete updatedLessonData.targetAgeMax;
      }

      if (updatedLessonData.isPublic !== undefined) {
        updatedLessonData.isPublic = parseBoolean(updatedLessonData.isPublic, false);
      }

      if (req.file) {
        if (oldLesson.videoFileName) {
          const oldFilePath = path.join('uploads/videos', oldLesson.videoFileName);

          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }

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

      res.status(200).json({
        success: true,
        message: 'שיעור עודכן בהצלחה',
        lesson: updatedLesson,
      });
    } catch (error) {
      console.error('Error updating lesson:', error);
      res.status(400).json({ message: error.message });
    }
  },

  // 🗑️ מחיקת שיעור
  deleteLesson: async (req, res) => {
    const { lessonId } = req.params;

    try {
      const lesson = await Lesson.findById(lessonId);

      if (!lesson) {
        return res.status(404).json({ message: 'שיעור לא נמצא' });
      }

      if (lesson.instructorId.toString() !== req.user.id) {
        return res.status(403).json({
          message: 'אתה לא מורשה למחוק שיעור זה',
        });
      }

      await Lesson.findByIdAndDelete(lessonId);

      if (lesson.videoFileName) {
        const filePath = path.join('uploads/videos', lesson.videoFileName);

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      res.status(200).json({
        success: true,
        message: 'שיעור נמחק בהצלחה',
      });
    } catch (error) {
      console.error('Error deleting lesson:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // 📺 השמעת ווידאו בזרם
  streamLesson: async (req, res) => {
    const { lessonId } = req.params;

    try {
      const lesson = await Lesson.findById(lessonId);

      if (!lesson) {
        return res.status(404).json({ message: 'שיעור לא נמצא' });
      }

      const videoPath = path.join('uploads/videos', lesson.videoFileName);

      if (!fs.existsSync(videoPath)) {
        return res.status(404).json({ message: 'קובץ וידאו לא נמצא' });
      }

      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        });

        fs.createReadStream(videoPath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        });

        fs.createReadStream(videoPath).pipe(res);
      }
    } catch (error) {
      console.error('Error streaming lesson:', error);

      res.status(500).json({
        message: 'שגיאה בהשמעת הווידאו',
        error: error.message,
      });
    }
  },

  // 👤 הרשמת סטודנט לשיעור
  enrollStudent: async (req, res) => {
    const { lessonId } = req.params;
    const studentId = req.user.id;

    try {
      const lesson = await Lesson.findById(lessonId);

      if (!lesson) {
        return res.status(404).json({ message: 'שיעור לא נמצא' });
      }

      if (lesson.enrolledStudents.includes(studentId)) {
        return res.status(400).json({
          message: 'אתה כבר רשום לשיעור זה',
        });
      }

      lesson.enrolledStudents.push(studentId);
      await lesson.save();

      res.status(200).json({
        success: true,
        message: 'נרשמת לשיעור בהצלחה',
      });
    } catch (error) {
      console.error('Error enrolling student:', error);

      res.status(500).json({
        message: 'שגיאה בהרשמה לשיעור',
        error: error.message,
      });
    }
  },

  // 🔍 חיפוש שיעורים
  searchLessons: async (req, res) => {
    const {
      search,
      language,
      isPublic,
      category,
      level,
      limit = 10,
      page = 1,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const query = {};

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { topic: { $regex: search, $options: 'i' } },
        ];
      }

      if (language) query.lessonLanguage = language;
      if (isPublic !== undefined) query.isPublic = isPublic === 'true';
      if (category) query.category = category;
      if (level) query.level = level;

      const sortObj = { [sortBy]: order === 'desc' ? -1 : 1 };

      const lessons = await Lesson.find(query)
        .sort(sortObj)
        .limit(parseInt(limit))
        .skip(skip)
        .populate('instructorId', 'username email');

      const total = await Lesson.countDocuments(query);

      res.status(200).json({
        success: true,
        count: lessons.length,
        total,
        pages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page),
        lessons,
      });
    } catch (error) {
      console.error('Error searching lessons:', error);

      res.status(500).json({
        message: 'שגיאה בחיפוש שיעורים',
        error: error.message,
      });
    }
  },

  // 📊 סטטיסטיקות מורה
  getInstructorStats: async (req, res) => {
    const { instructorId } = req.params;

    try {
      if (!mongoose.Types.ObjectId.isValid(instructorId)) {
        return res.status(400).json({ message: 'ID של מורה לא תקין' });
      }

      const totalLessons = await Lesson.countDocuments({ instructorId });

      const stats = await Lesson.aggregate([
        {
          $match: {
            instructorId: new mongoose.Types.ObjectId(instructorId),
          },
        },
        {
          $group: {
            _id: null,
            totalViews: { $sum: '$views' },
            totalStudents: { $sum: { $size: '$enrolledStudents' } },
            averageEnrollment: { $avg: { $size: '$enrolledStudents' } },
          },
        },
      ]);

      res.status(200).json({
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

      res.status(500).json({
        message: 'שגיאה בקבלת סטטיסטיקות',
        error: error.message,
      });
    }
  },
};

export default LessonController;