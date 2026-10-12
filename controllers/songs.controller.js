import Song from "../models/songs.model.js";
import mongoose from "mongoose";
import fs from "fs/promises";
import { existsSync, createReadStream, statSync } from "fs";
import path from "path";

import { cleanupContentReferences } from "../service/contentCleanup.service.js";

const allowedHobbies = ["art_music", "sports", "movies", "books"];
const allowedExpectations = [
  "grammar",
  "fluent_speaking",
  "confidence",
  "vocabulary",
];

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

const getSongFilePath = (fileName) =>
  path.join(process.cwd(), "songsList", fileName);

const getAudioContentType = (fileName = "") => {
  const extension = path.extname(fileName).toLowerCase();

  if (extension === ".wav") return "audio/wav";
  if (extension === ".m4a" || extension === ".mp4") return "audio/mp4";
  return "audio/mpeg";
};

const removeFileIfExists = async (filePath) => {
  try {
    if (filePath && existsSync(filePath)) await fs.unlink(filePath);
  } catch (error) {
    console.warn("Failed to remove song file:", error.message);
  }
};

export const SongsController = {
  // הוספת שיר חדש על ידי מורה
  addSong: async (req, res) => {
    try {
      const {
        title,
        theme,
        duration,
        level,
        category,
        targetAge,
        targetAgeMin,
        targetAgeMax,
        composer,
        lyricist,
        lessonId,
        hobbies,
        expectations,
        isPublic,
      } = req.body;

      if (
        !theme?.trim() ||
        !duration?.trim() ||
        !level?.trim() ||
        !targetAge?.trim() ||
        !composer?.trim() ||
        !lyricist?.trim()
      ) {
        await removeFileIfExists(req.file?.path);

        return res.status(400).json({
          success: false,
          message:
            "כל השדות חובה: theme, duration, level, targetAge, composer, lyricist",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "קובץ אודיו חובה",
        });
      }

      const newSong = new Song({
        title: title?.trim() || theme.trim(),
        theme: theme.trim(),
        duration: duration.trim(),
        level: level.trim(),
        category: category || "listening",
        targetAge: targetAge.trim(),
        targetAges: buildTargetAges(targetAgeMin, targetAgeMax),
        composer: composer.trim(),
        lyricist: lyricist.trim(),
        audioFileName: req.file.filename,
        uploadedBy: req.user.id,
        lesson: lessonId || null,
        hobbies: filterAllowedValues(
          safeJsonParseArray(hobbies),
          allowedHobbies
        ),
        expectations: filterAllowedValues(
          safeJsonParseArray(expectations),
          allowedExpectations
        ),
        isPublic: parseBoolean(isPublic, false),
        isWeeklySong: false,
        weeklySelectedAt: null,
      });

      await newSong.save();

      return res.status(201).json({
        success: true,
        message: "שיר נוסף בהצלחה",
        song: newSong,
      });
    } catch (error) {
      console.error("Error adding song:", error);
      await removeFileIfExists(req.file?.path);

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // קבלת כל השירים למנהל
  getAllSongs: async (req, res) => {
    try {
      const songs = await Song.find()
        .populate("uploadedBy", "username email role")
        .sort({ isWeeklySong: -1, weeklySelectedAt: -1, createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: songs.length,
        songs,
      });
    } catch (error) {
      console.error("Error fetching songs:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // קבלת שירים ציבוריים
  getPublicSongs: async (req, res) => {
    try {
      const songs = await Song.find({ isPublic: true })
        .populate("uploadedBy", "username")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: songs.length,
        songs,
      });
    } catch (error) {
      console.error("Error fetching public songs:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // קבלת שירים של מורה - מסך ניהול
  getSongsByInstructor: async (req, res) => {
    try {
      const { instructorId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(instructorId)) {
        return res.status(400).json({
          success: false,
          message: "ID של מורה לא תקין",
        });
      }

      const isOwner = instructorId.toString() === req.user.id.toString();
      const isAdmin = req.user.role === "admin";

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "אין לך הרשאה לצפות בשירים של מורה זו",
        });
      }

      const songs = await Song.find({ uploadedBy: instructorId })
        .populate("uploadedBy", "username email role")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: songs.length,
        songs,
      });
    } catch (error) {
      console.error("Error fetching songs by instructor:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // קבלת שיר השבוע
  getWeeklySong: async (req, res) => {
    try {
      const song = await Song.findOne({
        isWeeklySong: true,
        isPublic: true,
      })
        .populate("uploadedBy", "username")
        .sort({ weeklySelectedAt: -1 });

      return res.status(200).json({
        success: true,
        song,
      });
    } catch (error) {
      console.error("Error fetching weekly song:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // מנהל קובע שיר שבועי
  setWeeklySong: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "ID של שיר לא תקין",
        });
      }

      const song = await Song.findById(id);

      if (!song) {
        return res.status(404).json({
          success: false,
          message: "שיר לא נמצא",
        });
      }

      await Song.updateMany(
        { isWeeklySong: true },
        {
          $set: {
            isWeeklySong: false,
            weeklySelectedAt: null,
          },
        }
      );

      const updatedSong = await Song.findByIdAndUpdate(
        id,
        {
          $set: {
            isWeeklySong: true,
            weeklySelectedAt: new Date(),
            isPublic: true,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      ).populate("uploadedBy", "username email role");

      return res.status(200).json({
        success: true,
        message: "שיר השבוע עודכן בהצלחה",
        song: updatedSong,
      });
    } catch (error) {
      console.error("Error setting weekly song:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // עדכון שיר על ידי המורה שיצרה אותו או מנהל
  updateSong: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        await removeFileIfExists(req.file?.path);

        return res.status(400).json({
          success: false,
          message: "ID של שיר לא תקין",
        });
      }

      const oldSong = await Song.findById(id);

      if (!oldSong) {
        await removeFileIfExists(req.file?.path);

        return res.status(404).json({
          success: false,
          message: "שיר לא נמצא",
        });
      }

      const isOwner = oldSong.uploadedBy.toString() === req.user.id.toString();
      const isAdmin = req.user.role === "admin";

      if (!isOwner && !isAdmin) {
        await removeFileIfExists(req.file?.path);

        return res.status(403).json({
          success: false,
          message: "אין לך הרשאה לערוך שיר זה",
        });
      }

      const {
        title,
        theme,
        duration,
        level,
        category,
        targetAge,
        targetAgeMin,
        targetAgeMax,
        composer,
        lyricist,
        lessonId,
        hobbies,
        expectations,
        isPublic,
      } = req.body;

      const updatedSongData = {};

      if (title !== undefined) updatedSongData.title = title.trim();
      if (theme !== undefined) updatedSongData.theme = theme.trim();
      if (duration !== undefined) updatedSongData.duration = duration.trim();
      if (level !== undefined) updatedSongData.level = level.trim();
      if (category !== undefined) updatedSongData.category = category;
      if (targetAge !== undefined) updatedSongData.targetAge = targetAge.trim();
      if (composer !== undefined) updatedSongData.composer = composer.trim();
      if (lyricist !== undefined) updatedSongData.lyricist = lyricist.trim();
      if (lessonId !== undefined) updatedSongData.lesson = lessonId || null;

      if (hobbies !== undefined) {
        updatedSongData.hobbies = filterAllowedValues(
          safeJsonParseArray(hobbies),
          allowedHobbies
        );
      }

      if (expectations !== undefined) {
        updatedSongData.expectations = filterAllowedValues(
          safeJsonParseArray(expectations),
          allowedExpectations
        );
      }

      if (targetAgeMin !== undefined || targetAgeMax !== undefined) {
        updatedSongData.targetAges = buildTargetAges(
          targetAgeMin ?? oldSong.targetAges?.min,
          targetAgeMax ?? oldSong.targetAges?.max
        );
      }

      if (isPublic !== undefined) {
        updatedSongData.isPublic = parseBoolean(isPublic, oldSong.isPublic);
      }

      if (req.file) {
        updatedSongData.audioFileName = req.file.filename;
      }

      const updatedSong = await Song.findByIdAndUpdate(
        id,
        updatedSongData,
        {
          new: true,
          runValidators: true,
        }
      ).populate("uploadedBy", "username email role");

      if (req.file && oldSong.audioFileName) {
        await removeFileIfExists(getSongFilePath(oldSong.audioFileName));
      }

      return res.status(200).json({
        success: true,
        message: "שיר עודכן בהצלחה",
        song: updatedSong,
      });
    } catch (error) {
      console.error("Error updating song:", error);
      await removeFileIfExists(req.file?.path);

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // מחיקת שיר על ידי המורה שיצרה אותו או מנהל
  deleteSong: async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "ID של שיר לא תקין",
        });
      }

      const song = await Song.findById(id);

      if (!song) {
        return res.status(404).json({
          success: false,
          message: "שיר לא נמצא",
        });
      }

      const isOwner = song.uploadedBy.toString() === req.user.id.toString();
      const isAdmin = req.user.role === "admin";

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "אין לך הרשאה למחוק שיר זה",
        });
      }

      await cleanupContentReferences("song", song._id);
      await Song.findByIdAndDelete(song._id);

      if (song.audioFileName) {
        await removeFileIfExists(getSongFilePath(song.audioFileName));
      }

      return res.status(200).json({
        success: true,
        message: "שיר נמחק בהצלחה",
      });
    } catch (error) {
      next(error);
    }
  },

  // הזרמת קובץ אודיו ציבורי
  streamSong: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "ID של שיר לא תקין",
        });
      }

      const song = await Song.findById(id);

      if (!song || !song.audioFileName) {
        return res.status(404).json({
          success: false,
          message: "קובץ שיר לא נמצא",
        });
      }

      if (!song.isPublic) {
        return res.status(403).json({
          success: false,
          message: "השיר אינו ציבורי",
        });
      }

      const filePath = getSongFilePath(song.audioFileName);

      if (!existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: "קובץ אודיו לא נמצא בשרת",
        });
      }

      const fileSize = statSync(filePath).size;
      const range = req.headers.range;
      const contentType = getAudioContentType(song.audioFileName);

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (
          Number.isNaN(start) ||
          Number.isNaN(end) ||
          start < 0 ||
          end >= fileSize ||
          start > end
        ) {
          res.setHeader("Content-Range", `bytes */${fileSize}`);
          return res.sendStatus(416);
        }

        const chunkSize = end - start + 1;

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": contentType,
        });

        return createReadStream(filePath, { start, end }).pipe(res);
      }

      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": contentType,
      });

      return createReadStream(filePath).pipe(res);
    } catch (error) {
      console.error("Error streaming song:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};

export default SongsController;