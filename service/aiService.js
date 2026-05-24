import OpenAI from 'openai';
import { config } from 'dotenv';

config();

const openaiApiKey = process.env.OPENAI_API_KEY;
let openai = null;

if (openaiApiKey) {
  openai = new OpenAI({ apiKey: openaiApiKey });
} else {
  console.warn('⚠️ OPENAI_API_KEY is not set. AI routes will still load, but AI features are disabled.');
}

function assertOpenAI() {
  if (!openai) {
    throw new Error('Missing OpenAI API key. Set OPENAI_API_KEY in .env or environment.');
  }
}

class AIService {
  // AI-powered grammar correction
  async correctGrammar(text) {
    try {
      assertOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert English grammar teacher. Correct the grammar in the given text and provide a brief explanation of the corrections made. Keep your response concise and educational."
          },
          {
            role: "user",
            content: `Please correct this English text: "${text}"`
          }
        ],
        max_tokens: 300,
        temperature: 0.3,
      });

      return {
        original: text,
        corrected: completion.choices[0].message.content,
        success: true
      };
    } catch (error) {
      console.error('Grammar correction error:', error);
      return {
        original: text,
        corrected: text,
        error: 'AI service temporarily unavailable',
        success: false
      };
    }
  }

  // AI conversation practice
  async generateConversationResponse(userMessage, level = 'intermediate') {
    try {
      assertOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a friendly English conversation partner for ${level} level learners. Respond naturally and help them practice English. Keep responses conversational and encouraging. If they make mistakes, gently correct them.`
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
      });

      return {
        response: completion.choices[0].message.content,
        success: true
      };
    } catch (error) {
      console.error('Conversation AI error:', error);
      return {
        response: "I'm sorry, I'm having trouble responding right now. Let's try again later!",
        error: 'AI service temporarily unavailable',
        success: false
      };
    }
  }

  // Generate personalized exercises
  async generateExercise(topic, level = 'intermediate', exerciseType = 'vocabulary') {
    try {
      assertOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert English teacher creating personalized exercises. Create a ${exerciseType} exercise about "${topic}" for ${level} level learners. Include clear instructions, the exercise content, and answer key. Make it engaging and educational.`
          },
          {
            role: "user",
            content: `Create a ${exerciseType} exercise about ${topic} for ${level} English learners.`
          }
        ],
        max_tokens: 500,
        temperature: 0.6,
      });

      return {
        exercise: completion.choices[0].message.content,
        topic,
        level,
        type: exerciseType,
        success: true
      };
    } catch (error) {
      console.error('Exercise generation error:', error);
      return {
        exercise: `Sorry, couldn't generate exercise right now. Try: Write 5 sentences about ${topic}.`,
        topic,
        level,
        type: exerciseType,
        error: 'AI service temporarily unavailable',
        success: false
      };
    }
  }

  // AI writing feedback
  async provideWritingFeedback(text, writingType = 'essay') {
    try {
      assertOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an experienced English writing instructor. Provide constructive feedback on this ${writingType}. Focus on: grammar, vocabulary, structure, coherence, and suggestions for improvement. Be encouraging and specific.`
          },
          {
            role: "user",
            content: `Please provide feedback on this ${writingType}:\n\n${text}`
          }
        ],
        max_tokens: 400,
        temperature: 0.4,
      });

      return {
        feedback: completion.choices[0].message.content,
        originalText: text,
        writingType,
        success: true
      };
    } catch (error) {
      console.error('Writing feedback error:', error);
      return {
        feedback: "Great effort! Keep writing and practicing. Your English is improving!",
        originalText: text,
        writingType,
        error: 'AI service temporarily unavailable',
        success: false
      };
    }
  }

  // Generate study tips
  async getStudyTips(level = 'intermediate', focusArea = 'general') {
    try {
      assertOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert English learning coach. Provide 5 practical, actionable study tips for learners. Make them specific and encouraging."
          },
          {
            role: "user",
            content: `Give me 5 study tips for ${level} English learners focusing on ${focusArea}.`
          }
        ],
        max_tokens: 300,
        temperature: 0.5,
      });

      return {
        tips: completion.choices[0].message.content,
        level,
        focusArea,
        success: true
      };
    } catch (error) {
      console.error('Study tips error:', error);
      return {
        tips: "1. Practice daily\n2. Watch English movies\n3. Read English books\n4. Speak with native speakers\n5. Use language apps",
        level,
        focusArea,
        error: 'AI service temporarily unavailable',
        success: false
      };
    }
  }

  // AI-generated personalized course structure (Returns structured JSON)
  async generatePersonalizedCourse(user) {
    try {
      assertOpenAI();

      const interests = Array.isArray(user.favoriteHobbies) && user.favoriteHobbies.length > 0
        ? user.favoriteHobbies.join(', ')
        : 'general English learning';

      const prompt = `
        You are an expert English curriculum designer. 
        Create a personalized English course outline for a student based on their profile:
        - Age: ${user.age}
        - Hobbies: ${interests}
        - Level: ${user.englishLevel || 'beginner'}

        Return ONLY a valid JSON object (without any markdown code blocks, backticks, or extra commentary) with exactly this structure:
        {
          "title": "A personalized course title based on hobbies",
          "description": "A descriptive overview of the course goals",
          "category": "Choose exactly ONE from: grammar, vocabulary, conversation, reading, listening, general",
          "level": "Choose exactly ONE from: beginner, intermediate, advanced"
        }
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You output clean JSON based on requests." },
          { role: "user", content: prompt }
        ],
        max_tokens: 400,
        temperature: 0.6,
      });

      const courseData = JSON.parse(completion.choices[0].message.content.trim());

      return {
        success: true,
        course: courseData
      };
    } catch (error) {
      console.error('Personalized course generation error:', error);
      return {
        success: false,
        error: 'AI service temporarily unavailable',
        course: {
          title: 'General English Starter',
          description: 'A customized initial course to build fundamental English skills.',
          category: 'general',
          level: user.englishLevel || 'beginner'
        }
      };
    }
  }
}

export default new AIService();