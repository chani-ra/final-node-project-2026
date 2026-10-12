import express, { json, urlencoded } from "express";
import morgan from "morgan";
import cors from "cors";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

config();

import { connectDB } from "./config/db.js";
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
import { seedDefaultData } from "./seedDefaultData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const startApp = async () => {
  await connectDB();
  await seedDefaultData();

  app.use(json());
  app.use(urlencoded({ extended: true }));

  app.use(cors());
  app.use(morgan("dev"));

  // Public media only - private files cannot bypass controller permissions
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

  app.use(notFound);
  app.use(errorHandling);

  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
};

startApp().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

export default app;