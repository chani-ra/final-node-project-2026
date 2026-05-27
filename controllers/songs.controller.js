import Song from '../models/songs.model.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';
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

const parseBoolean = (value, defaultValue = true) => {
  if (value === undefined || value === null) return defaultValue;
  return value === true || value === 'true';
};

const buildTargetAges = (min, max) => ({
  min: Number(min) || 6,
  max: Number(max) || 120,
});

export const SongsController = {
  // ➕ הוספת שיר
  addSong: async (req, res) => {
    try {
      const {
        theme,
        title,
        duration,
        level,
        targetAge,
        composer,
        lyricist,
        lessonId,
        category,
        targetAgeMin,
        targetAgeMax,
        hobbies,
        expectations,
        isPublic,
      } = req.body;

      if (!theme || !duration || !level || !targetAge || !composer || !lyricist) {
        return res.status(400).json({
          success: false,
          message: 'כל השדות חובה: theme, duration, level, targetAge, composer, lyricist',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'קובץ אודיו חובה',
        });
      }

      const newSongData = {
        theme: theme.trim(),
        title: title?.trim() || theme.trim(),
        duration: duration.toString().trim(),
        level: level.trim(),
        targetAge: targetAge.trim(),
        composer: composer.trim(),
        lyricist: lyricist.trim(),

        audioFileName: req.file.filename,
        uploadedBy: req.user.id,
        lesson: lessonId || null,

        // שדות התאמה ל-AI
        category: category || 'listening',
        targetAges: buildTargetAges(targetAgeMin, targetAgeMax),
        hobbies: safeJsonParseArray(hobbies),
        expectations: safeJsonParseArray(expectations),
        isPublic: parseBoolean(isPublic, true),
      };

      const newSong = new Song(newSongData);
      await newSong.save();

      res.status(201).json({
        success: true,
        message: 'שיר נוסף בהצלחה',
        song: newSong,
      });
    } catch (error) {
      console.error('Error adding song:', error);

      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // 📖 קבלת כל השירים
  getAllSongs: async (req, res) => {
    try {
      const songs = await Song.find()
        .populate('uploadedBy', 'username email')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: songs.length,
        songs,
      });
    } catch (error) {
      console.error('Error fetching songs:', error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // 🎤 קבלת שירים לפי מזהה המורה
  getSongsByInstructor: async (req, res) => {
    try {
      const { instructorId } = req.params;

      const songs = await Song.find({ uploadedBy: instructorId })
        .populate('uploadedBy', 'username email')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: songs.length,
        songs,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // ✏️ עדכון שיר
  updateSong: async (req, res) => {
    const { id } = req.params;

    try {
      const oldSong = await Song.findById(id);

      if (!oldSong) {
        return res.status(404).json({
          success: false,
          message: 'שיר לא נמצא',
        });
      }

      if (oldSong.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'אתה לא מורשה לערוך שיר זה',
        });
      }

      const updatedSongData = { ...req.body };

      if (updatedSongData.hobbies) {
        updatedSongData.hobbies = safeJsonParseArray(updatedSongData.hobbies);
      }

      if (updatedSongData.expectations) {
        updatedSongData.expectations = safeJsonParseArray(updatedSongData.expectations);
      }

      if (updatedSongData.targetAgeMin || updatedSongData.targetAgeMax) {
        updatedSongData.targetAges = buildTargetAges(
          updatedSongData.targetAgeMin,
          updatedSongData.targetAgeMax
        );

        delete updatedSongData.targetAgeMin;
        delete updatedSongData.targetAgeMax;
      }

      if (updatedSongData.isPublic !== undefined) {
        updatedSongData.isPublic = parseBoolean(updatedSongData.isPublic, true);
      }

      if (req.file) {
        if (oldSong.audioFileName) {
          const oldFilePath = path.join(process.cwd(), 'songsList', oldSong.audioFileName);

          if (existsSync(oldFilePath)) {
            await fs.unlink(oldFilePath);
          }
        }

        updatedSongData.audioFileName = req.file.filename;
      }

      const updatedSong = await Song.findByIdAndUpdate(id, updatedSongData, {
        new: true,
        runValidators: true,
      });

      res.status(200).json({
        success: true,
        message: 'שיר עודכן בהצלחה',
        song: updatedSong,
      });
    } catch (error) {
      console.error('Error updating song:', error);

      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // 🗑️ מחיקת שיר
  deleteSong: async (req, res) => {
    const { id } = req.params;

    try {
      const deletedSong = await Song.findById(id);

      if (!deletedSong) {
        return res.status(404).json({
          success: false,
          message: 'שיר לא נמצא',
        });
      }

      if (deletedSong.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'אתה לא מורשה למחוק שיר זה',
        });
      }

      await Song.findByIdAndDelete(id);

      if (deletedSong.audioFileName) {
        const filePath = path.join(process.cwd(), 'songsList', deletedSong.audioFileName);

        if (existsSync(filePath)) {
          await fs.unlink(filePath);
        }
      }

      res.status(200).json({
        success: true,
        message: 'שיר נמחק בהצלחה',
      });
    } catch (error) {
      console.error('Error deleting song:', error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};

export default SongsController;