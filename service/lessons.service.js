import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Lesson from '../models/lessons.model.js';
import { cleanupContentReferences } from './contentCleanup.service.js';

// Expected failures keep their original HTTP status and JSON contract.
// Unexpected errors are handled separately in the HTTP controller.
export class LessonServiceError extends Error {
  constructor(statusCode, body) {
    super(body.message);
    this.name = 'LessonServiceError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

const fail = (statusCode, body) => {
  throw new LessonServiceError(statusCode, body);
};

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

export const canManageLesson = (lesson, user) => {
  if (user.role === 'admin') return true;
  if (user.role !== 'teacher') return false;
  const instructorId = lesson.instructorId?._id ?? lesson.instructorId;
  return instructorId?.toString() === user.id?.toString();
};

const pagination = ({ sortBy = 'createdAt', order = 'desc', limit = 10, page = 1 }) => {
  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const allowedSortFields = ['createdAt', 'title', 'views', 'level'];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  return {
    pageNumber,
    limitNumber,
    skip: (pageNumber - 1) * limitNumber,
    sortObj: { [safeSortBy]: order === 'asc' ? 1 : -1 },
  };
};

export const LessonService = {
  async uploadLesson(body, file, instructorId) {
    const {
      title, description, isPublic, lessonLanguage, topic, icon, category,
      level, targetAgeMin, targetAgeMax, hobbies, expectations,
    } = body;

    if (!title?.trim()) {
      fail(400, { success: false, message: 'כותרת שיעור היא חובה' });
    }
    if (!file) {
      fail(400, { success: false, message: 'קובץ וידאו חובה' });
    }

    const newLessonData = {
      instructorId,
      title: title.trim(),
      topic: topic?.trim() || '',
      icon: icon || '🧠',
      description: description?.trim() || '',
      videoFileName: file.filename,
      videoFileSize: file.size,
      videoUrl: `/uploads/videos/${file.filename}`,
      uploadStatus: 'completed',
      lessonLanguage: lessonLanguage || 'he',
      isPublic: parseBoolean(isPublic, true),
      category: category || 'general',
      level: level || 'beginner',
      targetAges: buildTargetAges(targetAgeMin, targetAgeMax),
      hobbies: safeJsonParseArray(hobbies),
      expectations: safeJsonParseArray(expectations),
    };

    const lesson = new Lesson(newLessonData);
    await lesson.save();
    await lesson.populate('instructorId', 'username email');
    return { success: true, message: 'שיעור הועלה בהצלחה', lesson };
  },

  async getInstructorLessons(instructorId, user, query) {
    if (!mongoose.Types.ObjectId.isValid(instructorId)) {
      fail(400, { success: false, message: 'ID של מורה לא תקין' });
    }
    const isOwner = instructorId.toString() === user.id.toString();
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      fail(403, { success: false, message: 'אין לך הרשאה לצפות בשיעורי מורה זו' });
    }
    const { pageNumber, limitNumber, skip, sortObj } = pagination(query);
    const [lessons, totalLessons] = await Promise.all([
      Lesson.find({ instructorId })
        .sort(sortObj)
        .limit(limitNumber)
        .skip(skip)
        .populate('instructorId', 'username email'),
      Lesson.countDocuments({ instructorId }),
    ]);
    return {
      success: true,
      count: lessons.length,
      total: totalLessons,
      pages: Math.ceil(totalLessons / limitNumber),
      currentPage: pageNumber,
      lessons,
    };
  },

  async getManagedLessonById(lessonId, user) {
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      fail(400, { message: 'ID של שיעור לא תקין' });
    }
    const lesson = await Lesson.findById(lessonId)
      .select('-enrolledStudents')
      .populate('instructorId', 'username');
    if (!lesson) {
      fail(404, { message: 'שיעור לא נמצא' });
    }
    if (!canManageLesson(lesson, user)) {
      fail(403, { message: 'אין לך הרשאה לצפות בשיעור זה' });
    }
    return lesson;
  },

  async getLessonById(lessonId) {
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      fail(400, { message: 'ID של שיעור לא תקין' });
    }
    const lesson = await Lesson.findById(lessonId)
      .select('-enrolledStudents')
      .populate('instructorId', 'username');
    if (!lesson) {
      fail(404, { message: 'שיעור לא נמצא' });
    }
    if (!lesson.isPublic) {
      fail(403, { message: 'השיעור אינו ציבורי' });
    }
    lesson.views += 1;
    await lesson.save();
    return lesson;
  },

  async updateLesson(lessonId, user, body, file) {
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      fail(400, { message: 'ID של שיעור לא תקין' });
    }
    const oldLesson = await Lesson.findById(lessonId);
    if (!oldLesson) {
      fail(404, { message: 'שיעור לא נמצא' });
    }
    const isOwner = oldLesson.instructorId.toString() === user.id.toString();
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      fail(403, { message: 'אין לך הרשאה לערוך שיעור זה' });
    }

    const {
      title, description, isPublic, lessonLanguage, topic, icon, category,
      level, targetAgeMin, targetAgeMax, hobbies, expectations,
    } = body;
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
    if (file) {
      updatedLessonData.videoFileName = file.filename;
      updatedLessonData.videoUrl = `/uploads/videos/${file.filename}`;
      updatedLessonData.videoFileSize = file.size;
    }

    const lesson = await Lesson.findByIdAndUpdate(lessonId, updatedLessonData, {
      new: true,
      runValidators: true,
    });

    if (file && oldLesson.videoFileName) {
      const oldFilePath = path.join('uploads/videos', oldLesson.videoFileName);
      try {
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      } catch (fileError) {
        console.warn('Failed to remove old lesson video:', fileError.message);
      }
    }
    return { success: true, message: 'שיעור עודכן בהצלחה', lesson };
  },

  async deleteLesson(lessonId, user) {
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      fail(400, { success: false, message: 'ID של שיעור לא תקין' });
    }
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      fail(404, { success: false, message: 'שיעור לא נמצא' });
    }
    const isOwner = lesson.instructorId.toString() === user.id.toString();
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      fail(403, { success: false, message: 'אין לך הרשאה למחוק שיעור זה' });
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
    return { success: true, message: 'שיעור נמחק בהצלחה' };
  },

  async enrollStudent(lessonId, studentId) {
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      fail(400, { message: 'ID של שיעור לא תקין' });
    }
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      fail(404, { message: 'שיעור לא נמצא' });
    }
    if (!lesson.isPublic) {
      fail(403, { message: 'השיעור אינו ציבורי' });
    }
    const alreadyEnrolled = lesson.enrolledStudents.some(
      (id) => id.toString() === studentId.toString()
    );
    if (alreadyEnrolled) {
      fail(400, { message: 'אתה כבר רשום לשיעור זה' });
    }
    lesson.enrolledStudents.push(studentId);
    await lesson.save();
    return { success: true, message: 'נרשמת לשיעור בהצלחה' };
  },

  async searchLessons({
    search, language, category, level, limit = 10, page = 1,
    sortBy = 'createdAt', order = 'desc',
  }) {
    const { pageNumber, limitNumber, skip, sortObj } = pagination({
      sortBy, order, limit, page,
    });
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

    const [lessons, total] = await Promise.all([
      Lesson.find(query)
        .select('title topic description icon category level targetAges hobbies expectations lessonLanguage views instructorId createdAt')
        .sort(sortObj)
        .limit(limitNumber)
        .skip(skip)
        .populate('instructorId', 'username')
        .lean(),
      Lesson.countDocuments(query),
    ]);
    return {
      success: true,
      count: lessons.length,
      total,
      pages: Math.ceil(total / limitNumber),
      currentPage: pageNumber,
      lessons,
    };
  },

  async getInstructorStats(instructorId, user) {
    if (!mongoose.Types.ObjectId.isValid(instructorId)) {
      fail(400, { success: false, message: 'ID של מורה לא תקין' });
    }
    const isOwner = instructorId.toString() === user.id.toString();
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      fail(403, { success: false, message: 'אין לך הרשאה לצפות בסטטיסטיקות אלו' });
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
    return {
      success: true,
      stats: {
        totalLessons,
        totalViews: stats[0]?.totalViews || 0,
        totalStudents: stats[0]?.totalStudents || 0,
        averageEnrollment: Math.round(stats[0]?.averageEnrollment || 0),
      },
    };
  },
};

export default LessonService;
