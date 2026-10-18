import { Router } from "express";
import ChatConversationController from "../controllers/chatConversation.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { aiLimiter } from "../middlewares/rateLimit.middleware.js";

const router = Router();

router.use(authenticateToken);

// קבלת כל השיחות שלי
router.get("/", ChatConversationController.getMyConversations);

// יצירת שיחה חדשה
router.post("/", ChatConversationController.createConversation);

// קבלת שיחה אחת
router.get("/:conversationId", ChatConversationController.getConversationById);

// הוספת הודעה לשיחה
router.post(
  "/:conversationId/messages",
  ChatConversationController.addMessageToConversation
);

// Server-generated replies, limited as AI requests.
router.post("/:conversationId/reply", aiLimiter, ChatConversationController.replyToConversation);

// שינוי שם שיחה
router.patch("/:conversationId", ChatConversationController.renameConversation);

// מחיקת שיחה
router.delete("/:conversationId", ChatConversationController.deleteConversation);

export default router;