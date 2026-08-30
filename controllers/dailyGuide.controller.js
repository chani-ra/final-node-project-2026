import { getOrCreateDailyGuide } from "../service/dailyGuide.service.js";

const DailyGuideController = {
  getTodayGuide: async (req, res, next) => {
    try {
      const userId = req.user.id;

      const result =
        await getOrCreateDailyGuide(userId);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default DailyGuideController;