import StudentTask from "../models/task.model.js";
import { randomUUID } from "node:crypto";

export const TaskController = {
  // קבלת כל המשימות של המשתמש המחובר
  getMyTasks: async (req, res) => {
    try {
      const tasks = await StudentTask.find({ user: req.user.id }).sort({
        status: 1,
        createdAt: -1,
      });

      return res.status(200).json({
        success: true,
        count: tasks.length,
        tasks,
      });
    } catch (error) {
      console.error("Error fetching student tasks:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // יצירת משימה חדשה לתלמידה המחוברת
  createMyTask: async (req, res) => {
    try {
      const {
        title,
        description,
        type,
        source,
        difficulty,
        estimatedTime,
        rewardXP,
        dueDate,
        relatedExercise,
        relatedLesson,
        relatedSong,
        coachPlanFocus,
      } = req.body;

      if (!title?.trim()) {
        return res.status(400).json({
          success: false,
          message: "כותרת משימה חובה",
        });
      }

      const newTask = await StudentTask.create({
        user: req.user.id,
        title: title.trim(),
        description: description?.trim() || "",
        type: type || "manual",
        source: source || "student",
        difficulty: difficulty || "Easy",
        estimatedTime: estimatedTime || "10 דקות",
        rewardXP: Number(rewardXP) || 50,
        dueDate: dueDate || null,
        relatedExercise: relatedExercise || null,
        relatedLesson: relatedLesson || null,
        relatedSong: relatedSong || null,
        coachPlanFocus: coachPlanFocus?.trim() || "",
      });

      return res.status(201).json({
        success: true,
        message: "המשימה נוצרה בהצלחה",
        task: newTask,
      });
    } catch (error) {
      console.error("Error creating student task:", error);

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // יצירת כמה משימות יחד, מיועד לשלבים של AI Coach
  createManyMyTasks: async (req, res) => {
    try {
      const {
        tasks,
        coachPlanFocus,
        planTitle,
      } = req.body;

      const planGroupId = randomUUID();

      const safePlanTitle =
        planTitle?.trim() ||
        coachPlanFocus?.trim() ||
        "תוכנית לימוד";
      if (!Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({
          success: false,
          message: "לא התקבלו משימות ליצירה",
        });
      }

      const docs = tasks
        .filter((task) => task?.title?.trim())
        .map((task) => ({
          user: req.user.id,
          title: task.title.trim(),
          description: task.description?.trim() || "",
          type: task.type || "coach_task",
          source: task.source || "ai_coach",
          status: "pending",
          difficulty: task.difficulty || "Easy",
          estimatedTime: task.estimatedTime || "10 דקות",
          rewardXP: Number(task.rewardXP) || 50,
          coachPlanFocus: coachPlanFocus || task.coachPlanFocus || "",
          planGroupId,
          planTitle: safePlanTitle,
        }));

      if (docs.length === 0) {
        return res.status(400).json({
          success: false,
          message: "לא נמצאו משימות תקינות ליצירה",
        });
      }

      const createdTasks = await StudentTask.insertMany(docs);

      return res.status(201).json({
        success: true,
        message: "המשימות נוספו בהצלחה",
        count: createdTasks.length,
        tasks: createdTasks,
      });
    } catch (error) {
      console.error("Error creating multiple student tasks:", error);

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // סימון משימה כבוצעה
  completeTask: async (req, res) => {
    try {
      const { id } = req.params;

      const task = await StudentTask.findOne({
        _id: id,
        user: req.user.id,
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "המשימה לא נמצאה",
        });
      }

      task.status = "completed";
      task.completedAt = new Date();

      if (!task.submittedAt) {
        task.submittedAt = new Date();
      }

      await task.save();

      return res.status(200).json({
        success: true,
        message: "המשימה סומנה כבוצעה",
        task,
      });
    } catch (error) {
      console.error("Error completing task:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // שליחת משימת מורה לבדיקה
  submitForReview: async (req, res) => {
    try {
      const { id } = req.params;

      const task = await StudentTask.findOne({
        _id: id,
        user: req.user.id,
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "המשימה לא נמצאה",
        });
      }

      task.status = "review";
      task.submittedAt = new Date();

      await task.save();

      return res.status(200).json({
        success: true,
        message: "המשימה נשלחה לבדיקה",
        task,
      });
    } catch (error) {
      console.error("Error submitting task for review:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // מחיקת משימה אישית
  deleteMyTask: async (req, res) => {
    try {
      const { id } = req.params;

      const deletedTask = await StudentTask.findOneAndDelete({
        _id: id,
        user: req.user.id,
      });

      if (!deletedTask) {
        return res.status(404).json({
          success: false,
          message: "המשימה לא נמצאה",
        });
      }

      return res.status(200).json({
        success: true,
        message: "המשימה נמחקה",
      });
    } catch (error) {
      console.error("Error deleting student task:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};

export default TaskController;