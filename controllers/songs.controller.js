// 
import Song from '../models/songs.model.js';
import fs from 'fs';
import path from 'path';

export const SongsController = {
    // ➕ הוספת שיר
    addSong: async (req, res) => {
        console.log('Received file:', req.file); // 🔍 לוג
        console.log('Request body:', req.body); // 🔍 לוג

        try {
            // Validation - בדוק שדות חובה
            const { theme, duration, level, targetAge, composer, lyricist } = req.body;

            if (!theme || !duration || !level || !targetAge || !composer || !lyricist) {
                return res.status(400).json({
                    message: 'כל השדות חובה: theme, duration, level, targetAge, composer, lyricist'
                });
            }

            // בדוק שקובץ קיים
            if (!req.file) {
                return res.status(400).json({
                    message: 'קובץ אודיו חובה'
                });
            }

            const newSongData = {
                theme: theme.trim(),
                duration: duration.trim(),
                level: level.trim(),
                targetAge: targetAge.trim(),
                composer: composer.trim(),
                lyricist: lyricist.trim(),
                audioFileName: req.file.filename // ✅ זה השם של הקובץ בשרת
            };

            const newSong = new Song(newSongData);
            await newSong.save();

            console.log('Song saved successfully:', newSong);

            res.status(201).json({
                message: 'שיר נוסף בהצלחה',
                song: newSong
            });

        } catch (error) {
            console.error('Error adding song:', error);
            res.status(400).json({ message: error.message });
        }
    },

    // 📖 קבלת כל השירים
    getAllSongs: async (req, res) => {
        try {
            const songs = await Song.find();
            res.status(200).json(songs);
        } catch (error) {
            console.error('Error fetching songs:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // ✏️ עדכון שיר
    updateSong: async (req, res) => {
        const { id } = req.params;

        try {
            // רכוש את השיר הישן כדי למחוק את הקובץ הישן אם צריך
            const oldSong = await Song.findById(id);
            if (!oldSong) {
                return res.status(404).json({ message: 'שיר לא נמצא' });
            }

            const updatedSongData = { ...req.body };

            // אם יש קובץ חדש
            if (req.file) {
                // מחוק את הקובץ הישן אם קיים
                if (oldSong.audioFileName) {
                    const oldFilePath = path.join('songsList', oldSong.audioFileName);
                    if (fs.existsSync(oldFilePath)) {
                        fs.unlinkSync(oldFilePath);
                        console.log('Old file deleted:', oldFilePath);
                    }
                }
                updatedSongData.audioFileName = req.file.filename;
            }

            const updatedSong = await Song.findByIdAndUpdate(id, updatedSongData, { new: true });

            res.status(200).json({
                message: 'שיר עודכן בהצלחה',
                song: updatedSong
            });

        } catch (error) {
            console.error('Error updating song:', error);
            res.status(400).json({ message: error.message });
        }
    },

    // 🗑️ מחיקת שיר
    deleteSong: async (req, res) => {
        const { id } = req.params;

        try {
            const deletedSong = await Song.findByIdAndDelete(id);

            if (!deletedSong) {
                return res.status(404).json({ message: 'שיר לא נמצא' });
            }

            // מחוק את הקובץ מהדיסק
            if (deletedSong.audioFileName) {
                const filePath = path.join('songsList', deletedSong.audioFileName);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log('File deleted:', filePath);
                }
            }

            res.status(200).json({
                message: 'שיר נמחק בהצלחה'
            });

        } catch (error) {
            console.error('Error deleting song:', error);
            res.status(500).json({ message: error.message });
        }
    }
};

export default SongsController;