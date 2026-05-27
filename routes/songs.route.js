import { Router } from "express";
import multer from "multer";
import path from "path";
import SongsController from "../controllers/songs.controller.js";
import { authenticateToken, requireTeacher } from "../middlewares/auth.middleware.js";

const router = Router();

// הגדרת אחסון קבצי אודיו
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "songsList/");
  },

  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

// סינון קבצי אודיו מותרים
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error("רק קבצי אודיו מותרים (MP3, WAV, M4A)"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// הוספת שיר
router.post(
  "/song",
  authenticateToken,
  requireTeacher,
  upload.single("audioFile"),
  SongsController.addSong
);

// קבלת כל השירים
router.get("/", SongsController.getAllSongs);

// קבלת שירים לפי מורה
router.get("/instructor/:instructorId", SongsController.getSongsByInstructor);

// ניגון שיר לפי מזהה
router.get("/song/:id/stream", SongsController.streamSong);

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