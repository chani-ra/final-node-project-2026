import User from "../models/users.model.js";
import Course from "../models/course.model.js";
import Task from "../models/task.model.js";
import Message from "../models/message.model.js";
import Song from "../models/songs.model.js";

export const getAdminStats = async (req, res) => {
  try {
    const [
      totalUsers,
      students,
      teachers,
      admins,
      totalCourses,
      publicCourses,
      aiCourses,
      totalTasks,
      pendingTasks,
      reviewTasks,
      completedTasks,
      totalMessages,
      highPriorityMessages,
      totalSongs,
      publicSongs,
      weeklySongs,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "teacher" }),
      User.countDocuments({ role: "admin" }),

      Course.countDocuments(),
      Course.countDocuments({ isPublic: true }),
      Course.countDocuments({ createdByAI: true }),

      Task.countDocuments(),
      Task.countDocuments({ status: "pending" }),
      Task.countDocuments({ status: "review" }),
      Task.countDocuments({ status: "completed" }),

      Message.countDocuments(),
      Message.countDocuments({ priority: "high" }),

      Song.countDocuments(),
      Song.countDocuments({ isPublic: true }),
      Song.countDocuments({ isWeeklySong: true }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          students,
          teachers,
          admins,
        },
        courses: {
          total: totalCourses,
          public: publicCourses,
          ai: aiCourses,
        },
        tasks: {
          total: totalTasks,
          pending: pendingTasks,
          review: reviewTasks,
          completed: completedTasks,
        },
        messages: {
          total: totalMessages,
          highPriority: highPriorityMessages,
        },
        songs: {
          total: totalSongs,
          public: publicSongs,
          weekly: weeklySongs,
        },
      },
    });
  } catch (error) {
    console.error("Error loading admin stats:", error);

    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === "production"
        ? "שגיאה בטעינת נתוני המערכת. נסי שוב."
        : error.message,
    });
  }
};