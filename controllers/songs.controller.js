import Song from '../models/song.model.js';
export const SongsController = {
// הוספת שיר
 addSong : async function (req, res) {
        try {
            const newSong = new Song(req.body);
            await newSong.save();
            res.status(201).json(newSong);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

// קבלת כל השירים
  getAllSongs :async (req, res) => {
    try {
        const songs = await Song.find();
        res.status(200).json(songs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
},

// עדכון שיר
 updateSong : async (req, res) => {
    const { id } = req.params;
    try {
        const updatedSong = await Song.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedSong) return res.status(404).json({ message: 'שיר לא נמצא' });
        res.status(200).json(updatedSong);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// מחיקת שיר
 deleteSong : async (req, res) => {
    const { id } = req.params;
    try {
        const deletedSong = await Song.findByIdAndDelete(id);
        if (!deletedSong) return res.status(404).json({ message: 'שיר לא נמצא' });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
};
export default SongsController;
