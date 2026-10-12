import { Router } from "express";
import multer from "multer";
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
  destination: (req, file, cb) => cb(null, songsDir),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname}`),
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "audio/mpeg",
    "audio/wav",
    "audio/mp4",
    "audio/x-m4a",
  ];

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

// Public routes
router.get("/public", SongsController.getPublicSongs);
router.get("/weekly", SongsController.getWeeklySong);
router.get("/song/:id/stream", SongsController.streamSong);

// Teacher / admin management
router.post(
  "/song",
  authenticateToken,
  requireTeacher,
  upload.single("audioFile"),
  SongsController.addSong
);

router.get(
  "/instructor/:instructorId",
  authenticateToken,
  requireTeacher,
  SongsController.getSongsByInstructor
);

router.put(
  "/song/:id",
  authenticateToken,
  requireTeacher,
  upload.single("audioFile"),
  SongsController.updateSong
);

router.delete(
  "/song/:id",
  authenticateToken,
  requireTeacher,
  SongsController.deleteSong
);

// Admin routes
router.get(
  "/admin/all",
  authenticateToken,
  requireAdmin,
  SongsController.getAllSongs
);

router.patch(
  "/song/:id/weekly",
  authenticateToken,
  requireAdmin,
  SongsController.setWeeklySong
);

export default router;