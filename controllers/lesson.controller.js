import Lesson from '../models/lessons.model.js';
import fs from 'fs';
import path from 'path';

export const LessonController = {
  // ➕ העלאת שיעור חדש
  uploadLesson: async (req, res) => {
    console.log('Received file:', req.file); // 🔍 לוג
    console.log('Request body:', req.body); // 🔍 לוג

    try {
      // Validation - בדוק שדות חובה
      const { title, description, isPublic, language } = req.body;

      if (!title) {
        return res.status(400).json({
          message: 'כותרת שיעור היא חובה'
        });
      }

      // בדוק שקובץ קיים
      if (!req.file) {
        return res.status(400).json({
          message: 'קובץ ווידאו חובה'
        });
      }

      const newLessonData = {
        instructorId: req.user.id,
        title: title.trim(),
        description: description?.trim() || '',
        videoFileName: req.file.filename, // ✅ זה השם של הקובץ בשרת
        videoFileSize: req.file.size,
        isPublic: isPublic === 'true' || isPublic === true,
        language: language || 'he',
        uploadStatus: 'completed',
        videoUrl: `/uploads/videos/${req.file.filename}`
      };

      const newLesson = new Lesson(newLessonData);
      await newLesson.save();

      // טעינת המורה כדי לשלוח מידע מלא
      await newLesson.populate('instructorId', 'username email');

      console.log('Lesson saved successfully:', newLesson);

      res.status(201).json({
        message: 'שיעור הועלה בהצלחה',
        lesson: newLesson
      });

    } catch (error) {
      console.error('Error uploading lesson:', error);

      // מחיקת קובץ אם קרתה שגיאה
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          /* ignore */
        }
      }

      res.status(400).json({ message: error.message });
    }
  },

  // 📖 קבלת כל השיעורים של מורה
  getInstructorLessons: async (req, res) => {
    const { instructorId } = req.params;
    const { sortBy = 'createdAt', order = 'desc', limit = 10, page = 1 } = req.query;

    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const sortObj = {};
      sortObj[sortBy] = order === 'desc' ? -1 : 1;

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
        lessons
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
        return res.status(404).json({
          message: 'שיעור לא נמצא'
        });
      }

      // עדכון מונה הצפיות
      lesson.views += 1;
      await lesson.save();

      res.status(200).json({
        success: true,
        lesson
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
      // רכוש את השיעור הישן
      const oldLesson = await Lesson.findById(lessonId);
      if (!oldLesson) {
        return res.status(404).json({ message: 'שיעור לא נמצא' });
      }

      // בדיקה של הרשאות (רק המורה שיצר יכול לערוך)
      if (oldLesson.instructorId.toString() !== req.user.id) {
        return res.status(403).json({
          message: 'אתה לא מורשה לערוך שיעור זה'
        });
      }

      const updatedLessonData = { ...req.body };

      // אם יש קובץ חדש
      if (req.file) {
        // מחוק את הקובץ הישן אם קיים
        if (oldLesson.videoFileName) {
          const oldFilePath = path.join('uploads/videos', oldLesson.videoFileName);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
            console.log('Old file deleted:', oldFilePath);
          }
        }
        updatedLessonData.videoFileName = req.file.filename;
        updatedLessonData.videoUrl = `/uploads/videos/${req.file.filename}`;
        updatedLessonData.videoFileSize = req.file.size;
      }

      updatedLessonData.updatedAt = Date.now();

      const updatedLesson = await Lesson.findByIdAndUpdate(
        lessonId,
        updatedLessonData,
        { new: true }
      );

      res.status(200).json({
        message: 'שיעור עודכן בהצלחה',
        lesson: updatedLesson
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
      const deletedLesson = await Lesson.findByIdAndDelete(lessonId);

      if (!deletedLesson) {
        return res.status(404).json({ message: 'שיעור לא נמצא' });
      }

      // בדיקה של הרשאות (רק המורה שיצר יכול למחוק)
      if (deletedLesson.instructorId.toString() !== req.user.id) {
        return res.status(403).json({
          message: 'אתה לא מורשה למחוק שיעור זה'
        });
      }

      // מחוק את הקובץ מהדיסק
      if (deletedLesson.videoFileName) {
        const filePath = path.join('uploads/videos', deletedLesson.videoFileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('File deleted:', filePath);
        }
      }

      res.status(200).json({
        message: 'שיעור נמחק בהצלחה'
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
        return res.status(404).json({
          message: 'שיעור לא נמצא'
        });
      }

      const videoPath = path.join('uploads/videos', lesson.videoFileName);

      // בדיקה אם הקובץ קיים
      if (!fs.existsSync(videoPath)) {
        return res.status(404).json({
          message: 'קובץ ווידאו לא נמצא'
        });
      }

      // קבלת גודל הקובץ
      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      // טיפול בstream ranges (לשיוך מהר יותר)
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
        error: error.message
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
        return res.status(404).json({
          message: 'שיעור לא נמצא'
        });
      }

      // בדיקה אם כבר רשום
      if (lesson.enrolledStudents.includes(studentId)) {
        return res.status(400).json({
          message: 'אתה כבר רשום לשיעור זה'
        });
      }

      lesson.enrolledStudents.push(studentId);
      await lesson.save();

      res.status(200).json({
        message: 'נרשמת לשיעור בהצלחה'
      });

    } catch (error) {
      console.error('Error enrolling student:', error);
      res.status(500).json({
        message: 'שגיאה בהרשמה לשיעור',
        error: error.message
      });
    }
  },

  // 🔍 חיפוש שיעורים
  searchLessons: async (req, res) => {
    const { search, language, isPublic, limit = 10, page = 1, sortBy = 'createdAt', order = 'desc' } = req.query;

    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const query = {};
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }
      if (language) query.language = language;
      if (isPublic) query.isPublic = isPublic === 'true';

      const sortObj = {};
      sortObj[sortBy] = order === 'desc' ? -1 : 1;

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
        lessons
      });

    } catch (error) {
      console.error('Error searching lessons:', error);
      res.status(500).json({
        message: 'שגיאה בחיפוש שיעורים',
        error: error.message
      });
    }
  },

  // 📊 סטטיסטיקות מורה
  getInstructorStats: async (req, res) => {
    const { instructorId } = req.params;

    try {
      // בדיקה אם ה-ID תקין
      if (!instructorId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          message: 'ID של מורה לא תקין'
        });
      }

      // ספירת סך הכל שיעורים
      const totalLessons = await Lesson.countDocuments({ instructorId });

      // aggregation - קבלת סטטיסטיקות מתקדמות
      const stats = await Lesson.aggregate([
        {
          $match: {
            instructorId: require('mongoose').Types.ObjectId(instructorId)
          }
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
        error: error.message
      });
    }
  }
};

export default LessonController;