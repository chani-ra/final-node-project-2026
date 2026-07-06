import { Router } from "express";
import ReviewController from "../controllers/review.controller.js";
import {
  authenticateToken,
  requireAdmin,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", ReviewController.getApprovedReviews);

router.post("/", authenticateToken, ReviewController.createReview);

router.get("/my", authenticateToken, ReviewController.getMyReviews);

router.get(
  "/admin/all",
  authenticateToken,
  requireAdmin,
  ReviewController.getAllReviewsForAdmin
);

router.patch(
  "/admin/:reviewId/approve",
  authenticateToken,
  requireAdmin,
  ReviewController.approveReview
);

router.patch(
  "/admin/:reviewId/reject",
  authenticateToken,
  requireAdmin,
  ReviewController.rejectReview
);

router.delete(
  "/admin/:reviewId",
  authenticateToken,
  requireAdmin,
  ReviewController.deleteReview
);

export default router;