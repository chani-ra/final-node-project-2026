import Message from "../models/message.model.js";
import User from "../models/users.model.js";

const getRecipientsByTarget = async ({ targetType, targetUser }) => {
  if (targetType === "single") {
    if (!targetUser) {
      throw new Error("יש לבחור משתמש לקבלת הודעה אישית");
    }

    const user = await User.findById(targetUser);

    if (!user) {
      throw new Error("המשתמש שנבחר לא נמצא");
    }

    return [user];
  }

  const roleQueryByTarget = {
    all: {},
    students: { role: { $in: ["student", "user"] } },
    teachers: { role: "teacher" },
    admins: { role: "admin" },
  };

  const query = roleQueryByTarget[targetType];

  if (query === undefined) {
    throw new Error("סוג נמענים לא תקין");
  }

  return await User.find(query).select("_id username email role");
};

export const MessageController = {
  // מנהל שולח הודעה לקבוצה או למשתמש בודד
  sendAdminMessage: async (req, res) => {
    try {
      const { title, body, targetType, targetUser, messageType, priority } =
        req.body;

      if (!title?.trim()) {
        return res.status(400).json({
          success: false,
          message: "כותרת הודעה חובה",
        });
      }

      if (!body?.trim()) {
        return res.status(400).json({
          success: false,
          message: "תוכן הודעה חובה",
        });
      }

      const recipientsUsers = await getRecipientsByTarget({
        targetType,
        targetUser,
      });

      if (!recipientsUsers.length) {
        return res.status(400).json({
          success: false,
          message: "לא נמצאו נמענים מתאימים",
        });
      }

      const message = new Message({
        title: title.trim(),
        body: body.trim(),
        sender: req.user.id,
        targetType,
        targetUser: targetType === "single" ? targetUser : null,
        messageType: messageType || "announcement",
        priority: priority || "normal",
        recipients: recipientsUsers.map((user) => ({
          user: user._id,
          isRead: false,
          readAt: null,
        })),
      });

      await message.save();

      const populatedMessage = await Message.findById(message._id)
        .populate("sender", "username email role")
        .populate("targetUser", "username email role")
        .populate("recipients.user", "username email role");

      return res.status(201).json({
        success: true,
        message: "ההודעה נשלחה בהצלחה",
        count: recipientsUsers.length,
        data: populatedMessage,
      });
    } catch (error) {
      console.error("Error sending admin message:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // משתמש מחובר מקבל את ההודעות שלו
  getMyMessages: async (req, res) => {
    try {
      const messages = await Message.find({
        "recipients.user": req.user.id,
      })
        .populate("sender", "username email role")
        .sort({ createdAt: -1 });

      const formattedMessages = messages.map((message) => {
        const recipientData = message.recipients.find(
          (recipient) => recipient.user.toString() === req.user.id
        );

        return {
          _id: message._id,
          title: message.title,
          body: message.body,
          sender: message.sender,
          targetType: message.targetType,
          messageType: message.messageType,
          priority: message.priority,
          createdAt: message.createdAt,
          isRead: recipientData?.isRead || false,
          readAt: recipientData?.readAt || null,
        };
      });

      return res.status(200).json({
        success: true,
        count: formattedMessages.length,
        messages: formattedMessages,
      });
    } catch (error) {
      console.error("Error fetching my messages:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // סימון הודעה כנקראה
  markAsRead: async (req, res) => {
    try {
      const { messageId } = req.params;

      const message = await Message.findOneAndUpdate(
        {
          _id: messageId,
          "recipients.user": req.user.id,
        },
        {
          $set: {
            "recipients.$.isRead": true,
            "recipients.$.readAt": new Date(),
          },
        },
        { new: true }
      );

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "הודעה לא נמצאה",
        });
      }

      return res.status(200).json({
        success: true,
        message: "ההודעה סומנה כנקראה",
      });
    } catch (error) {
      console.error("Error marking message as read:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // מנהל רואה הודעות שנשלחו
  getAdminSentMessages: async (req, res) => {
    try {
      const messages = await Message.find()
        .populate("sender", "username email role")
        .populate("targetUser", "username email role")
        .sort({ createdAt: -1 })
        .limit(100);

      return res.status(200).json({
        success: true,
        count: messages.length,
        messages,
      });
    } catch (error) {
      console.error("Error fetching sent messages:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};

export default MessageController;