
// import express, {json ,urlencoded } from 'express';
// import morgan from 'morgan';
// import cors from 'cors';
// import { config } from 'dotenv';


// import { connectDB } from './config/db.js';

// import userRoutes from './routes/users.route.js';
// import adminRoutes from './routes/admin.route.js';
// import songsRoutes from './routes/songs.route.js'

// config();


// const app = express();

//  connectDB();

// app.use(json());
// app.use(urlencoded());

// app.use(cors());
// app.use(morgan('dev'));

// app.use('/songsList', express.static('songsList'));

// app.get('/', (req, res) => {
//     res.send('Welcome to the Learning Platform API');
// });

// // Routes                                       
// app.use('/users',userRoutes);
// app.use('/admin', adminRoutes);
// app.use('/songs',songsRoutes );


// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Server is running on port http://localhost:${PORT}`);
// });


import express, { json, urlencoded } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ============ CONFIG ============
config();

// ============ DATABASE CONNECTION ============
import { connectDB } from './config/db.js';
connectDB();

// ============ ROUTES ============
import userRoutes from './routes/users.route.js';
import adminRoutes from './routes/admin.route.js';
import songsRoutes from './routes/songs.route.js';
import lessonRoutes from './routes/lessons.route.js'; // ➕ חדש

// ============ MIDDLEWARE IMPORTS ============
import { handleUploadError } from './config/multer.js'; // ➕ חדש

// ============ ES6 __dirname ============
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============ INITIALIZE EXPRESS ============
const app = express();

// ============ MIDDLEWARE ============
app.use(json({ limit: '10mb' })); // הגדלנו limit לווידאו
app.use(urlencoded({ limit: '10mb', extended: true })); // ➕ extended: true

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(morgan('dev'));

// ============ STATIC FILES ============
app.use('/songsList', express.static('songsList'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // ➕ חדש - ווידאו

// ============ HEALTH CHECK ============
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the Learning Platform API',
    version: '1.0.0',
    endpoints: {
      users: '/users',
      admin: '/admin',
      songs: '/songs',
      lessons: '/lessons', // ➕ חדש
    },
  });
});

// ============ API ROUTES ============
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/songs', songsRoutes);
app.use('/api/lessons', lessonRoutes); // ➕ חדש

// ============ UPLOAD ERROR HANDLING ============
app.use(handleUploadError); // ➕ חדש - חייב להיות אחרי הרוטים

// ============ 404 HANDLER ============
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ============ GLOBAL ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📚 Learning Platform API v1.0.0`);
  console.log(`🔗 Available routes:`);
  console.log(`   - Users:   /api/users`);
  console.log(`   - Admin:   /api/admin`);
  console.log(`   - Songs:   /api/songs`);
  console.log(`   - Lessons: /api/lessons ✨`);
});

export default app;
