import { Router } from "express";
import MessageController from "../controllers/message.controller.js";
import {
  authenticateToken,
  requireAdmin,
} from "../middlewares/auth.middleware.js";

const router = Router();

// מנהל שולח הודעה
router.post(
  "/admin/send",
  authenticateToken,
  requireAdmin,
  MessageController.sendAdminMessage
);

// מנהל רואה היסטוריית הודעות
router.get(
  "/admin/sent",
  authenticateToken,
  requireAdmin,
  MessageController.getAdminSentMessages
);

// משתמש מחובר רואה את ההודעות שלו
router.get("/my", authenticateToken, MessageController.getMyMessages);

// משתמש מסמן הודעה כנקראה
router.patch("/:messageId/read", authenticateToken, MessageController.markAsRead);

export default router;