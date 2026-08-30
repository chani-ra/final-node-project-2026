import express from "express";

import DailyGuideController from "../controllers/dailyGuide.controller.js";

import {
  authenticateToken,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/today",
  authenticateToken,
  DailyGuideController.getTodayGuide
);

router.post(
  "/refresh",
  authenticateToken,
  DailyGuideController.refreshTodayGuide
);

export default router;