import DictionaryWord from "../models/dictionaryWord.model.js";

export const DictionaryController = {
  // קבלת כל המילים של המשתמש המחובר
  getMyWords: async (req, res) => {
    try {
      const words = await DictionaryWord.find({ user: req.user.id }).sort({
        createdAt: -1,
      });

      return res.status(200).json({
        success: true,
        count: words.length,
        words,
      });
    } catch (error) {
      console.error("Error fetching dictionary words:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // שמירת מילה חדשה במילון
  addWord: async (req, res) => {
    try {
      const { word, translation, definition, example } = req.body;

      if (!word?.trim()) {
        return res.status(400).json({
          success: false,
          message: "חובה להזין מילה באנגלית",
        });
      }

      if (!translation?.trim()) {
        return res.status(400).json({
          success: false,
          message: "חובה להזין תרגום",
        });
      }

      const cleanWord = word.trim();
      const cleanTranslation = translation.trim();

      const existingWord = await DictionaryWord.findOne({
        user: req.user.id,
        word: new RegExp(`^${escapeRegExp(cleanWord)}$`, "i"),
      });

      if (existingWord) {
        return res.status(400).json({
          success: false,
          message: "המילה כבר קיימת במילון האישי שלך",
        });
      }

      const newWord = await DictionaryWord.create({
        user: req.user.id,
        word: cleanWord,
        translation: cleanTranslation,
        definition: definition?.trim() || "",
        example: example?.trim() || "",
        mastered: false,
      });

      return res.status(201).json({
        success: true,
        message: "המילה נשמרה במילון",
        word: newWord,
      });
    } catch (error) {
      console.error("Error adding dictionary word:", error);

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // שינוי סטטוס יודעת / בתרגול
  toggleMastered: async (req, res) => {
    try {
      const { id } = req.params;

      const word = await DictionaryWord.findOne({
        _id: id,
        user: req.user.id,
      });

      if (!word) {
        return res.status(404).json({
          success: false,
          message: "המילה לא נמצאה",
        });
      }

      word.mastered = !word.mastered;
      await word.save();

      return res.status(200).json({
        success: true,
        message: "סטטוס המילה עודכן",
        word,
      });
    } catch (error) {
      console.error("Error toggling dictionary word:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // מחיקת מילה מהמילון
  deleteWord: async (req, res) => {
    try {
      const { id } = req.params;

      const deletedWord = await DictionaryWord.findOneAndDelete({
        _id: id,
        user: req.user.id,
      });

      if (!deletedWord) {
        return res.status(404).json({
          success: false,
          message: "המילה לא נמצאה",
        });
      }

      return res.status(200).json({
        success: true,
        message: "המילה נמחקה מהמילון",
      });
    } catch (error) {
      console.error("Error deleting dictionary word:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default DictionaryController;