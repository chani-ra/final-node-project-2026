import Song from "../models/songs.model.js";
import fs from "fs/promises";
import { existsSync, createReadStream, statSync } from "fs";
import path from "path";

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

const getSongFilePath = (fileName) => {
  return path.join(process.cwd(), "songsList", fileName);
};

const getAudioContentType = (fileName = "") => {
  const extension = path.extname(fileName).toLowerCase();

  if (extension === ".wav") return "audio/wav";
  if (extension === ".m4a") return "audio/mp4";
  if (extension === ".mp4") return "audio/mp4";

  return "audio/mpeg";
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

      if (!theme || !duration || !level || !targetAge || !composer || !lyricist) {
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

  // קבלת שירים ציבוריים לתלמידים
  getPublicSongs: async (req, res) => {
    try {
      const songs = await Song.find({ isPublic: true })
        .populate("uploadedBy", "username email role")
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

  // קבלת שירים לפי מורה
  getSongsByInstructor: async (req, res) => {
    try {
      const { instructorId } = req.params;

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

  // קבלת שיר השבוע לתלמידים
  getWeeklySong: async (req, res) => {
    try {
      const song = await Song.findOne({ isWeeklySong: true })
        .populate("uploadedBy", "username email role")
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
          runValidators: false,
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

  // עדכון שיר על ידי מורה או מנהל
  updateSong: async (req, res) => {
    try {
      const { id } = req.params;

      const oldSong = await Song.findById(id);

      if (!oldSong) {
        return res.status(404).json({
          success: false,
          message: "שיר לא נמצא",
        });
      }

      const isOwner = oldSong.uploadedBy.toString() === req.user.id;
      const isAdmin = req.user.role === "admin";

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "אין לך הרשאה לערוך שיר זה",
        });
      }

      const updatedSongData = { ...req.body };

      if (updatedSongData.title) {
        updatedSongData.title = updatedSongData.title.trim();
      }

      if (updatedSongData.theme) {
        updatedSongData.theme = updatedSongData.theme.trim();
      }

      if (updatedSongData.duration) {
        updatedSongData.duration = updatedSongData.duration.trim();
      }

      if (updatedSongData.targetAge) {
        updatedSongData.targetAge = updatedSongData.targetAge.trim();
      }

      if (updatedSongData.composer) {
        updatedSongData.composer = updatedSongData.composer.trim();
      }

      if (updatedSongData.lyricist) {
        updatedSongData.lyricist = updatedSongData.lyricist.trim();
      }

      if (updatedSongData.hobbies !== undefined) {
        updatedSongData.hobbies = filterAllowedValues(
          safeJsonParseArray(updatedSongData.hobbies),
          allowedHobbies
        );
      }

      if (updatedSongData.expectations !== undefined) {
        updatedSongData.expectations = filterAllowedValues(
          safeJsonParseArray(updatedSongData.expectations),
          allowedExpectations
        );
      }

      if (
        updatedSongData.targetAgeMin !== undefined ||
        updatedSongData.targetAgeMax !== undefined
      ) {
        updatedSongData.targetAges = buildTargetAges(
          updatedSongData.targetAgeMin ?? oldSong.targetAges?.min,
          updatedSongData.targetAgeMax ?? oldSong.targetAges?.max
        );

        delete updatedSongData.targetAgeMin;
        delete updatedSongData.targetAgeMax;
      }

      if (updatedSongData.isPublic !== undefined) {
        updatedSongData.isPublic = parseBoolean(
          updatedSongData.isPublic,
          false
        );
      }

      if (updatedSongData.isWeeklySong !== undefined && !isAdmin) {
        delete updatedSongData.isWeeklySong;
      }

      if (updatedSongData.weeklySelectedAt !== undefined && !isAdmin) {
        delete updatedSongData.weeklySelectedAt;
      }

      if (req.file) {
        if (oldSong.audioFileName) {
          const oldFilePath = getSongFilePath(oldSong.audioFileName);

          if (existsSync(oldFilePath)) {
            await fs.unlink(oldFilePath);
          }
        }

        updatedSongData.audioFileName = req.file.filename;
      }

      delete updatedSongData.uploadedBy;

      const updatedSong = await Song.findByIdAndUpdate(id, updatedSongData, {
        new: true,
        runValidators: true,
      }).populate("uploadedBy", "username email role");

      return res.status(200).json({
        success: true,
        message: "שיר עודכן בהצלחה",
        song: updatedSong,
      });
    } catch (error) {
      console.error("Error updating song:", error);

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // מחיקת שיר על ידי מורה או מנהל
  deleteSong: async (req, res) => {
    try {
      const { id } = req.params;

      const song = await Song.findById(id);

      if (!song) {
        return res.status(404).json({
          success: false,
          message: "שיר לא נמצא",
        });
      }

      const isOwner = song.uploadedBy.toString() === req.user.id;
      const isAdmin = req.user.role === "admin";

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "אין לך הרשאה למחוק שיר זה",
        });
      }

      if (song.audioFileName) {
        const filePath = getSongFilePath(song.audioFileName);

        if (existsSync(filePath)) {
          await fs.unlink(filePath);
        }
      }

      await Song.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: "שיר נמחק בהצלחה",
      });
    } catch (error) {
      console.error("Error deleting song:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // הזרמת קובץ אודיו
  streamSong: async (req, res) => {
    try {
      const { id } = req.params;

      const song = await Song.findById(id);

      if (!song || !song.audioFileName) {
        return res.status(404).json({
          success: false,
          message: "קובץ שיר לא נמצא",
        });
      }

      const filePath = getSongFilePath(song.audioFileName);

      if (!existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: "קובץ אודיו לא נמצא בשרת",
        });
      }

      const stat = statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;
      const contentType = getAudioContentType(song.audioFileName);

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        const file = createReadStream(filePath, { start, end });

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": contentType,
        });

        file.pipe(res);
        return;
      }

      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": contentType,
      });

      createReadStream(filePath).pipe(res);
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