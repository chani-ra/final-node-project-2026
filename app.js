
import express, { json, urlencoded } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

config();

import { connectDB } from './config/db.js';
import { notFound, errorHandling } from './middlewares/errors.middleware.js';
import userRoutes from './routes/users.route.js';
import adminRoutes from './routes/admin.route.js';
import courseRoutes from './routes/courses.route.js';
import songsRoutes from './routes/songs.route.js';
import lessonRoutes from './routes/lessons.route.js';
import quizRoutes from './routes/quizzes.route.js';
import exerciseRoutes from './routes/exercises.route.js';
import messageRoutes from './routes/message.route.js';
import profileRoutes from './routes/profile.route.js';
import aiRoutes from './routes/ai.route.js';
import { seedDefaultData } from './seedDefaultData.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const startApp = async () => {
  await connectDB();
  await seedDefaultData();

  // ============ MIDDLEWARE ============
app.use(json()); 
app.use(urlencoded({ extended: true })); // ✅ שינוי מ-50mb ל-500mb

// 2️⃣ CORS וLogging
app.use(cors());
app.use(morgan('dev'));

// 3️⃣ Static files
app.use('/songsList', express.static('songsList'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 4️⃣ Test route
app.get('/', (req, res) => {
  res.send('Welcome to the Learning Platform API');
});

// 5️⃣ Routes
app.use('/users', userRoutes);app.use('/admin', adminRoutes);
app.use('/courses', courseRoutes);
app.use('/songs', songsRoutes);
app.use('/lessons', lessonRoutes);
app.use('/quizzes', quizRoutes);
app.use('/exercises', exerciseRoutes);
app.use("/messages", messageRoutes);
app.use('/profile', profileRoutes);
app.use('/ai', aiRoutes);

// ============ Error handling ============
app.use(notFound);
app.use(errorHandling);

// ============ Server ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
};

startApp().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;