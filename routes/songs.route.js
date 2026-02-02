// import { Router } from 'express';
// import multer from 'multer';
// import {SongsController } from '../controllers/songs.controller.js';

// const router = Router();
// // const upload = multer({ dest: 'songsList/' });

// // const storage = multer.diskStorage({
// //     destination: function (req, file, cb) {
// //         cb(null, 'songsList/'); // היכן שהקבצים יישמרו
// //     },
// //     filename: function (req, file, cb) {
// //         cb(null, file.originalname); // שמירה בשם המקורי
// //     }
// // });

// //     const upload = multer({ storage: storage });

// const upload = multer({ dest: 'songsList/' });

// router.post('/song', upload.single('audioFileName'), SongsController.addSong);
// router.get('/', SongsController.getAllSongs); 
// router.put('/song/:id', upload.single('audioFileName'), SongsController.updateSong); 
// router.delete('/song/:id', SongsController.deleteSong);  

// export default router;


import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import SongsController from '../controllers/songs.controller.js';

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
router.post('/song', upload.single('audioFile'), SongsController.addSong);
router.get('/', SongsController.getAllSongs); 
router.put('/song/:id', upload.single('audioFile'), SongsController.updateSong); 
router.delete('/song/:id', SongsController.deleteSong);  

export default router;











