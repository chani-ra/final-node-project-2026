import Review from "../models/review.model.js";
import User from "../models/users.model.js";
import { createReviewValidationSchema } from "../validation/review.validation.js";

export const ReviewController = {
  // דף הבית: קבלת המלצות מאושרות בלבד
  getApprovedReviews: async (req, res) => {
    try {
      const reviews = await Review.find({ status: "approved" })
        .sort({ approvedAt: -1, createdAt: -1 })
        .limit(12)
        .select("usernameSnapshot roleSnapshot text rating approvedAt createdAt");

      return res.status(200).json({
        success: true,
        reviews,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // משתמשת מחוברת מוסיפה המלצה
  createReview: async (req, res) => {
    const { error, value } = createReviewValidationSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    try {
      const user = await User.findById(req.user.id).select("username role");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "משתמש לא נמצא",
        });
      }

      const review = new Review({
        user: user._id,
        usernameSnapshot: user.username,
        roleSnapshot: user.role,
        text: value.text,
        rating: value.rating || 5,
        status: "pending",
      });

      await review.save();

      return res.status(201).json({
        success: true,
        message: "ההמלצה נשלחה בהצלחה וממתינה לאישור מנהל",
        review,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // המשתמשת רואה את ההמלצות שהיא שלחה
  getMyReviews: async (req, res) => {
    try {
      const reviews = await Review.find({ user: req.user.id }).sort({
        createdAt: -1,
      });

      return res.status(200).json({
        success: true,
        reviews,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // מנהל רואה את כל ההמלצות
  getAllReviewsForAdmin: async (req, res) => {
    try {
      const { status } = req.query;

      const query = status && status !== "all" ? { status } : {};

      const reviews = await Review.find(query)
        .populate("user", "username email role")
        .populate("approvedBy", "username email role")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        reviews,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // מנהל מאשר המלצה
  approveReview: async (req, res) => {
    try {
      const { reviewId } = req.params;

      const review = await Review.findByIdAndUpdate(
        reviewId,
        {
          status: "approved",
          approvedBy: req.user.id,
          approvedAt: new Date(),
          adminNote: "",
        },
        { new: true }
      );

      if (!review) {
        return res.status(404).json({
          success: false,
          message: "המלצה לא נמצאה",
        });
      }

      return res.status(200).json({
        success: true,
        message: "ההמלצה אושרה ותוצג בדף הבית",
        review,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // מנהל דוחה המלצה
  rejectReview: async (req, res) => {
    try {
      const { reviewId } = req.params;
      const { adminNote } = req.body;

      const review = await Review.findByIdAndUpdate(
        reviewId,
        {
          status: "rejected",
          approvedBy: null,
          approvedAt: null,
          adminNote: adminNote || "",
        },
        { new: true }
      );

      if (!review) {
        return res.status(404).json({
          success: false,
          message: "המלצה לא נמצאה",
        });
      }

      return res.status(200).json({
        success: true,
        message: "ההמלצה נדחתה",
        review,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // מנהל מוחק המלצה
  deleteReview: async (req, res) => {
    try {
      const { reviewId } = req.params;

      const review = await Review.findByIdAndDelete(reviewId);

      if (!review) {
        return res.status(404).json({
          success: false,
          message: "המלצה לא נמצאה",
        });
      }

      return res.status(200).json({
        success: true,
        message: "ההמלצה נמחקה",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};

export default ReviewController;