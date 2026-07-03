import { Router } from "express";
import ReviewController from "../controllers/review.controller.js";
import {
  authenticateToken,
  requireAdmin,
} from "../middlewares/auth.middleware.js";

const router = Router();

// דף הבית - ציבורי: מציג רק המלצות מאושרות
router.get("/", ReviewController.getApprovedReviews);

// משתמשת מחוברת מוסיפה המלצה
router.post("/", authenticateToken, ReviewController.createReview);

// המשתמשת רואה את ההמלצות שהיא שלחה
router.get("/my", authenticateToken, ReviewController.getMyReviews);

// מנהל רואה הכול
router.get(
  "/admin/all",
  authenticateToken,
  requireAdmin,
  ReviewController.getAllReviewsForAdmin
);

// מנהל מאשר
router.patch(
  "/admin/:reviewId/approve",
  authenticateToken,
  requireAdmin,
  ReviewController.approveReview
);

// מנהל דוחה
router.patch(
  "/admin/:reviewId/reject",
  authenticateToken,
  requireAdmin,
  ReviewController.rejectReview
);

// מנהל מוחק
router.delete(
  "/admin/:reviewId",
  authenticateToken,
  requireAdmin,
  ReviewController.deleteReview
);

export default router;