import Song from "../models/songs.model.js";
import fs from "fs/promises";
import { existsSync, createReadStream, statSync } from "fs";
import path from "path";

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
  return value === true || value === "true";
};

const buildTargetAges = (min, max) => ({
  min: Number(min) || 6,
  max: Number(max) || 120,
});

// זיהוי סוג קובץ אודיו לפי סיומת
const getAudioContentType = (filename) => {
  const ext = path.extname(filename).toLowerCase();

  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".m4a") return "audio/mp4";
  if (ext === ".mp4") return "audio/mp4";

  return "audio/mpeg";
};

export const SongsController = {
  // הוספת שיר חדש על ידי מורה
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
          message: "כל השדות חובה: theme, duration, level, targetAge, composer, lyricist",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "קובץ אודיו חובה",
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
        category: category || "listening",
        targetAges: buildTargetAges(targetAgeMin, targetAgeMax),
        hobbies: safeJsonParseArray(hobbies),
        expectations: safeJsonParseArray(expectations),
        isPublic: parseBoolean(isPublic, false),
      };

      const newSong = new Song(newSongData);
      await newSong.save();

      res.status(201).json({
        success: true,
        message: "שיר נוסף בהצלחה",
        song: newSong,
      });
    } catch (error) {
      console.error("Error adding song:", error);

      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // קבלת כל השירים
  getAllSongs: async (req, res) => {
    try {
      const songs = await Song.find()
        .populate("uploadedBy", "username email")
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: songs.length,
        songs,
      });
    } catch (error) {
      console.error("Error fetching songs:", error);

      res.status(500).json({
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
        .populate("uploadedBy", "username email")
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

  // ניגון שיר לפי מזהה
  streamSong: async (req, res) => {
    try {
      const { id } = req.params;

      const song = await Song.findById(id);

      if (!song) {
        return res.status(404).json({
          success: false,
          message: "שיר לא נמצא",
        });
      }

      if (!song.audioFileName) {
        return res.status(404).json({
          success: false,
          message: "לא נמצא קובץ אודיו לשיר הזה",
        });
      }

      const audioPath = path.join(process.cwd(), "songsList", song.audioFileName);

      if (!existsSync(audioPath)) {
        return res.status(404).json({
          success: false,
          message: "קובץ האודיו לא נמצא בשרת",
        });
      }

      const stat = statSync(audioPath);
      const fileSize = stat.size;
      const range = req.headers.range;
      const contentType = getAudioContentType(song.audioFileName);

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": contentType,
        });

        createReadStream(audioPath, { start, end }).pipe(res);
        return;
      }

      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": contentType,
      });

      createReadStream(audioPath).pipe(res);
    } catch (error) {
      console.error("Error streaming song:", error);

      res.status(500).json({
        success: false,
        message: "שגיאה בהשמעת השיר",
        error: error.message,
      });
    }
  },

  // עדכון שיר
  updateSong: async (req, res) => {
    const { id } = req.params;

    try {
      const oldSong = await Song.findById(id);

      if (!oldSong) {
        return res.status(404).json({
          success: false,
          message: "שיר לא נמצא",
        });
      }

      if (oldSong.uploadedBy.toString() !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "אתה לא מורשה לערוך שיר זה",
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
        updatedSongData.isPublic = parseBoolean(updatedSongData.isPublic, false);
      }

      if (req.file) {
        if (oldSong.audioFileName) {
          const oldFilePath = path.join(process.cwd(), "songsList", oldSong.audioFileName);

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
        message: "שיר עודכן בהצלחה",
        song: updatedSong,
      });
    } catch (error) {
      console.error("Error updating song:", error);

      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // מחיקת שיר
  deleteSong: async (req, res) => {
    const { id } = req.params;

    try {
      const deletedSong = await Song.findById(id);

      if (!deletedSong) {
        return res.status(404).json({
          success: false,
          message: "שיר לא נמצא",
        });
      }

      if (deletedSong.uploadedBy.toString() !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "אתה לא מורשה למחוק שיר זה",
        });
      }

      await Song.findByIdAndDelete(id);

      if (deletedSong.audioFileName) {
        const filePath = path.join(process.cwd(), "songsList", deletedSong.audioFileName);

        if (existsSync(filePath)) {
          await fs.unlink(filePath);
        }
      }

      res.status(200).json({
        success: true,
        message: "שיר נמחק בהצלחה",
      });
    } catch (error) {
      console.error("Error deleting song:", error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};

export default SongsController;