import path from "path";
import Lesson from "../models/lessons.model.js";
import Song from "../models/songs.model.js";

const getFileName = (req) => path.basename(req.path);

export const allowPublicLessonVideo = async (req, res, next) => {
  try {
    const fileName = getFileName(req);

    const lesson = await Lesson.findOne({
      videoFileName: fileName,
    })
      .select("isPublic")
      .lean();

    if (!lesson) {
      return res.status(404).json({
        message: "קובץ וידאו לא נמצא",
      });
    }

    if (!lesson.isPublic) {
      return res.status(403).json({
        message: "הווידאו אינו ציבורי",
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

export const allowPublicSongAudio = async (req, res, next) => {
  try {
    const fileName = getFileName(req);

    const song = await Song.findOne({
      audioFileName: fileName,
    })
      .select("isPublic")
      .lean();

    if (!song) {
      return res.status(404).json({
        message: "קובץ אודיו לא נמצא",
      });
    }

    if (!song.isPublic) {
      return res.status(403).json({
        message: "השיר אינו ציבורי",
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
};