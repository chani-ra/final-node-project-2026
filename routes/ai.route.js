import express from 'express';
import aiService from '../service/aiService.js';
import UserService from '../service/users.service.js';
import CourseService from '../service/courses.service.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All AI routes require authentication
router.use(authenticateToken);

// Grammar correction
router.post('/grammar-correct', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Text is required for grammar correction'
      });
    }

    const result = await aiService.correctGrammar(text.trim());

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Grammar correction route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to correct grammar',
      error: error.message
    });
  }
});

// AI conversation practice
router.post('/conversation', async (req, res) => {
  try {
    const { message, level = 'intermediate' } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required for conversation'
      });
    }

    const result = await aiService.generateConversationResponse(message.trim(), level);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Conversation route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate conversation response',
      error: error.message
    });
  }
});

// Generate personalized exercises
router.post('/generate-exercise', async (req, res) => {
  try {
    const { topic, level = 'intermediate', exerciseType = 'vocabulary' } = req.body;

    if (!topic || topic.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required for exercise generation'
      });
    }

    const result = await aiService.generateExercise(topic.trim(), level, exerciseType);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Exercise generation route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate exercise',
      error: error.message
    });
  }
});

// Writing feedback
router.post('/writing-feedback', async (req, res) => {
  try {
    const { text, writingType = 'essay' } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Text is required for writing feedback'
      });
    }

    const result = await aiService.provideWritingFeedback(text.trim(), writingType);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Writing feedback route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to provide writing feedback',
      error: error.message
    });
  }
});

// Study tips
router.get('/study-tips', async (req, res) => {
  try {
    const { level = 'intermediate', focusArea = 'general' } = req.query;

    const result = await aiService.getStudyTips(level, focusArea);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Study tips route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get study tips',
      error: error.message
    });
  }
});

// AI-powered quiz generation
router.post('/generate-quiz', async (req, res) => {
  try {
    const { topic, difficulty = 'intermediate', questionCount = 5 } = req.body;

    if (!topic || topic.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required for quiz generation'
      });
    }

    const result = await aiService.generateExercise(topic, difficulty, 'quiz');

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Quiz generation route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate quiz',
      error: error.message
    });
  }
});

// AI-generated personalized learning plan
router.get('/learning-plan', async (req, res) => {
  try {
    const user = await UserService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    const recommendedCourses = await CourseService.getRecommendedCourses(user);
    const result = await aiService.generateLearningPlan(user, recommendedCourses.slice(0, 5));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Learning plan route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate learning plan',
      error: error.message
    });
  }
});

export default router;