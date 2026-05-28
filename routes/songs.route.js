import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

import SongsController from "../controllers/songs.controller.js";
import {
  authenticateToken,
  requireTeacher,
  requireAdmin,
} from "../middlewares/auth.middleware.js";

const router = Router();

const songsDir = "songsList/";

if (!fs.existsSync(songsDir)) {
  fs.mkdirSync(songsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, songsDir);
  },

  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("רק קבצי אודיו מותרים (MP3, WAV, M4A)"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// מורה מעלה שיר
router.post(
  "/song",
  authenticateToken,
  requireTeacher,
  upload.single("audioFile"),
  SongsController.addSong
);

// מנהל מקבל את כל השירים
router.get(
  "/admin/all",
  authenticateToken,
  requireAdmin,
  SongsController.getAllSongs
);

// קבלת שירים ציבוריים
router.get("/public", SongsController.getPublicSongs);

// קבלת שיר השבוע
router.get("/weekly", SongsController.getWeeklySong);

// מנהל קובע שיר שבועי
router.patch(
  "/song/:id/weekly",
  authenticateToken,
  requireAdmin,
  SongsController.setWeeklySong
);

// הזרמת אודיו
router.get("/song/:id/stream", SongsController.streamSong);

// קבלת שירים של מורה
router.get(
  "/instructor/:instructorId",
  authenticateToken,
  SongsController.getSongsByInstructor
);

// עדכון שיר
router.put(
  "/song/:id",
  authenticateToken,
  requireTeacher,
  upload.single("audioFile"),
  SongsController.updateSong
);

// מחיקת שיר
router.delete(
  "/song/:id",
  authenticateToken,
  requireTeacher,
  SongsController.deleteSong
);

export default router;