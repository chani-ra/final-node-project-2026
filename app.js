
// import express, { json, urlencoded } from 'express';
// import morgan from 'morgan';
// import cors from 'cors';
// import { config } from 'dotenv';
// import path from 'path';
// import { fileURLToPath } from 'url';

// config();

// import { connectDB } from './config/db.js';

// import userRoutes from './routes/users.route.js';
// import adminRoutes from './routes/admin.route.js';
// import songsRoutes from './routes/songs.route.js';
// import lessonRoutes from './routes/lessons.route.js';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const app = express();

// connectDB();

// // ============ MIDDLEWARE בסדר נכון ============

// // 1️⃣ Parsing middleware (חובה ראשונה!)
// app.use(json());
// app.use(urlencoded({ extended: true }));

// // 2️⃣ CORS וLogging
// app.use(cors());
// app.use(morgan('dev'));

// // 3️⃣ Static files (לפני routes!)
// app.use('/songsList', express.static('songsList'));
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// // 4️⃣ Test route
// app.get('/', (req, res) => {
//   res.send('Welcome to the Learning Platform API');
// });

// // 5️⃣ Routes (אחרי middleware!)
// app.use('/users', userRoutes);
// app.use('/admin', adminRoutes);
// app.use('/songs', songsRoutes);
// app.use('/lessons', lessonRoutes);

// // ============ Error handling ============
// app.use((err, req, res, next) => {
//   console.error('❌ Error:', err.message);
//   res.status(500).json({ message: err.message });
// });

// // ============ Server ============
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server is running on http://localhost:${PORT}`);
// });

// export default app;

import express, { json, urlencoded } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

config();

import { connectDB } from './config/db.js';
import userRoutes from './routes/users.route.js';
import adminRoutes from './routes/admin.route.js';
import courseRoutes from './routes/courses.route.js';
import songsRoutes from './routes/songs.route.js';
import lessonRoutes from './routes/lessons.route.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

connectDB();

// ============ MIDDLEWARE ============

// 1️⃣ Parsing middleware - ⚠️ עדכן את ה-limit
app.use(json({ limit: '500mb' })); // ✅ שינוי מ-50mb ל-500mb
app.use(urlencoded({ extended: true, limit: '500mb' })); // ✅ שינוי מ-50mb ל-500mb

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
app.use('/users', userRoutes);
app.use('/admin', adminRoutes);
app.use('/courses', courseRoutes);
app.use('/songs', songsRoutes);
app.use('/lessons', lessonRoutes);

// ============ Error handling ============
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ message: err.message });
});

// ============ Server ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

export default app;