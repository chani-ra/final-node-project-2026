import "dotenv/config";
import express, { json, urlencoded } from "express";
import morgan from "morgan";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { notFound, errorHandling } from "./middlewares/errors.middleware.js";
import {
  allowPublicLessonVideo,
  allowPublicSongAudio,
} from "./middlewares/publicMedia.middleware.js";

import userRoutes from "./routes/users.route.js";
import adminRoutes from "./routes/admin.route.js";
import courseRoutes from "./routes/courses.route.js";
import songsRoutes from "./routes/songs.route.js";
import lessonRoutes from "./routes/lessons.route.js";
import studentTaskRoutes from "./routes/task.route.js";
import quizRoutes from "./routes/quizzes.route.js";
import exerciseRoutes from "./routes/exercises.route.js";
import dictionaryRoutes from "./routes/dictionary.route.js";
import chatConversationRoutes from "./routes/chatConversation.route.js";
import messageRoutes from "./routes/message.route.js";
import reviewRoute from "./routes/review.route.js";
import profileRoutes from "./routes/profile.route.js";
import dailyGuideRoutes from "./routes/dailyGuide.route.js";
import aiRoutes from "./routes/ai.route.js";
import courseProgressRoutes from "./routes/courseProgress.route.js";
import learningRoutes from "./routes/learning.route.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin is not allowed by CORS"));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use(
  "/uploads/videos",
  allowPublicLessonVideo,
  express.static(path.join(__dirname, "uploads", "videos"))
);

app.use(
  "/songsList",
  allowPublicSongAudio,
  express.static(path.join(__dirname, "songsList"))
);

app.get("/", (req, res) => {
  res.send("Welcome to the Learning Platform API");
});

app.use("/users", userRoutes);
app.use("/admin", adminRoutes);
app.use("/courses", courseRoutes);
app.use("/songs", songsRoutes);
app.use("/lessons", lessonRoutes);
app.use("/tasks", studentTaskRoutes);
app.use("/quizzes", quizRoutes);
app.use("/exercises", exerciseRoutes);
app.use("/dictionary", dictionaryRoutes);
app.use("/chat-conversations", chatConversationRoutes);
app.use("/messages", messageRoutes);
app.use("/reviews", reviewRoute);
app.use("/profile", profileRoutes);
app.use("/ai/daily-guide", dailyGuideRoutes);
app.use("/ai", aiRoutes);
app.use("/course-progress", courseProgressRoutes);
app.use("/learning", learningRoutes);

app.use(notFound);
app.use(errorHandling);

export default app;