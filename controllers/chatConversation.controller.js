import ChatConversation from "../models/chatConversation.model.js";
import { generateConversationReply } from "../service/conversationAI.service.js";

const MAX_MESSAGES_PER_CONVERSATION = 80;

export const ChatConversationController = {
  // קבלת כל השיחות של המשתמש המחובר
  getMyConversations: async (req, res) => {
    try {
      const conversations = await ChatConversation.find({
        user: req.user.id,
        isArchived: false,
      })
        .sort({ lastMessageAt: -1 })
        .select("title messages lastMessageAt createdAt updatedAt")
        .lean();

      const formattedConversations = conversations.map((conversation) => {
        const lastMessage =
          conversation.messages?.[conversation.messages.length - 1] || null;

        return {
          _id: conversation._id,
          title: conversation.title,
          lastMessage,
          messagesCount: conversation.messages?.length || 0,
          lastMessageAt: conversation.lastMessageAt,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        };
      });

      return res.status(200).json({
        success: true,
        count: formattedConversations.length,
        conversations: formattedConversations,
      });
    } catch (error) {
      console.error("Error fetching chat conversations:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // קבלת שיחה אחת מלאה
  getConversationById: async (req, res) => {
    try {
      const { conversationId } = req.params;

      const conversation = await ChatConversation.findOne({
        _id: conversationId,
        user: req.user.id,
        isArchived: false,
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "השיחה לא נמצאה",
        });
      }

      return res.status(200).json({
        success: true,
        conversation,
      });
    } catch (error) {
      console.error("Error fetching chat conversation:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // יצירת שיחה חדשה
  createConversation: async (req, res) => {
    try {
      const { title } = req.body;

      const conversation = await ChatConversation.create({
        user: req.user.id,
        title: title?.trim() || "שיחה חדשה עם בולט",
        messages: [],
        lastMessageAt: new Date(),
      });

      return res.status(201).json({
        success: true,
        message: "השיחה נוצרה בהצלחה",
        conversation,
      });
    } catch (error) {
      console.error("Error creating chat conversation:", error);

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // הוספת הודעה לשיחה קיימת
  addMessageToConversation: async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { sender, text } = req.body;

      if (sender !== "user") {
        return res.status(400).json({
          success: false,
          message: "סוג שולח לא תקין",
        });
      }

      if (!text?.trim()) {
        return res.status(400).json({
          success: false,
          message: "תוכן הודעה חובה",
        });
      }

      const conversation = await ChatConversation.findOne({
        _id: conversationId,
        user: req.user.id,
        isArchived: false,
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "השיחה לא נמצאה",
        });
      }

      conversation.messages.push({
        sender,
        text: text.trim(),
        createdAt: new Date(),
      });

      if (conversation.messages.length > MAX_MESSAGES_PER_CONVERSATION) {
        conversation.messages = conversation.messages.slice(
          conversation.messages.length - MAX_MESSAGES_PER_CONVERSATION
        );
      }

      conversation.lastMessageAt = new Date();

      if (
        sender === "user" &&
        (!conversation.title || conversation.title === "שיחה חדשה עם בולט")
      ) {
        conversation.title = buildConversationTitle(text);
      }

      await conversation.save();

      return res.status(200).json({
        success: true,
        message: "ההודעה נשמרה",
        conversation,
      });
    } catch (error) {
      console.error("Error adding chat message:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // One server-controlled operation: the client supplies only its own message.
  // Both the user message and the AI response are stored by the Backend.
  replyToConversation: async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const { message, level } = req.body;
      const cleanMessage = typeof message === "string" ? message.trim() : "";
      if (!cleanMessage || cleanMessage.length > 4000) {
        return res.status(400).json({ success: false, message: "הודעה חייבת להכיל 1 עד 4000 תווים" });
      }

      const filter = { _id: conversationId, user: req.user.id, isArchived: false };
      const conversation = await ChatConversation.findOne(filter).select("title").lean();
      if (!conversation) {
        return res.status(404).json({ success: false, message: "השיחה לא נמצאה" });
      }

      const reply = await generateConversationReply({ message: cleanMessage, level });
      const now = new Date();
      const set = { lastMessageAt: now };
      if (!conversation.title || conversation.title === "שיחה חדשה עם בולט") {
        set.title = buildConversationTitle(cleanMessage);
      }
      // Atomic append prevents losing messages when multiple requests arrive.
      const updatedConversation = await ChatConversation.findOneAndUpdate(
        filter,
        {
          $push: { messages: { $each: [
            { sender: "user", text: cleanMessage, createdAt: now },
            { sender: "ai", text: reply, createdAt: new Date() },
          ], $slice: -MAX_MESSAGES_PER_CONVERSATION } },
          $set: set,
        },
        { new: true, runValidators: true }
      );
      if (!updatedConversation) {
        return res.status(404).json({ success: false, message: "השיחה לא נמצאה" });
      }
      return res.status(200).json({ success: true, reply, conversation: updatedConversation });
    } catch (error) {
      next(error);
    }
  },

  // שינוי שם שיחה
  renameConversation: async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { title } = req.body;

      if (!title?.trim()) {
        return res.status(400).json({
          success: false,
          message: "שם שיחה חובה",
        });
      }

      const conversation = await ChatConversation.findOneAndUpdate(
        {
          _id: conversationId,
          user: req.user.id,
          isArchived: false,
        },
        {
          title: title.trim(),
        },
        { new: true }
      );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "השיחה לא נמצאה",
        });
      }

      return res.status(200).json({
        success: true,
        message: "שם השיחה עודכן",
        conversation,
      });
    } catch (error) {
      console.error("Error renaming chat conversation:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // מחיקת שיחה
  deleteConversation: async (req, res) => {
    try {
      const { conversationId } = req.params;

      const conversation = await ChatConversation.findOneAndDelete({
        _id: conversationId,
        user: req.user.id,
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "השיחה לא נמצאה",
        });
      }

      return res.status(200).json({
        success: true,
        message: "השיחה נמחקה",
      });
    } catch (error) {
      console.error("Error deleting chat conversation:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};

function buildConversationTitle(text) {
  const cleanText = text.trim().replace(/\s+/g, " ");

  if (cleanText.length <= 38) return cleanText;

  return `${cleanText.slice(0, 38)}...`;
}

export default ChatConversationController;