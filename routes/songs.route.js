


import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import SongsController from '../controllers/songs.controller.js';
import { authenticateToken, requireTeacher } from '../middlewares/auth.middleware.js';

const router = Router();

// ⚙️ הגדרות multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'songsList/');
    },
    filename: function (req, file, cb) {
        // שם ייחודי: timestamp + שם מקורי
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});

// Validation - רק MP3, WAV, M4A
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('רק קבצי אודיו מותרים (MP3, WAV, M4A)'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// ✅ שדה הקובץ חייב להיות 'audioFile' (זה מה שShולחים ב-React)
router.post('/song', authenticateToken, requireTeacher, upload.single('audioFile'), SongsController.addSong);
router.get('/', SongsController.getAllSongs); 
router.get('/instructor/:instructorId', SongsController.getSongsByInstructor);
router.put('/song/:id', authenticateToken, requireTeacher, upload.single('audioFile'), SongsController.updateSong); 
router.delete('/song/:id', authenticateToken, requireTeacher, SongsController.deleteSong);  

export default router;











