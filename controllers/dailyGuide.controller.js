import {
  getOrCreateDailyGuide,
  refreshDailyGuide,
} from "../service/dailyGuide.service.js";

const DailyGuideController = {
  getTodayGuide: async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await getOrCreateDailyGuide(
          req.user.id
        );

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  refreshTodayGuide: async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await refreshDailyGuide(
          req.user.id
        );

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