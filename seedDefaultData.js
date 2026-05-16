import bcrypt from 'bcryptjs';
import fs from 'fs';
import User from './models/users.model.js';
import Course from './models/course.model.js';
import Quiz from './models/quiz.model.js';
import Lesson from './models/lessons.model.js';
import Song from './models/songs.model.js';

export const seedDefaultData = async () => {
  try {
    const adminEmail = 'admin@englishplatform.com';
    const teacherEmail = 'teacher@englishplatform.com';

    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      admin = await User.create({
        username: 'Admin',
        email: adminEmail,
        password: hashedPassword,
        age: 30,
        parentOrChild: 'הורה',
        favoriteHobbies: ['אומנות ומוזיקה'],
        gender: 'male',
        role: 'admin',
        enrolledCourses: [],
        courseProgress: [],
        quizResults: [],
      });
      console.log('✅ Default admin created:', adminEmail);
    }

    let teacher = await User.findOne({ email: teacherEmail });
    if (!teacher) {
      const hashedPassword = await bcrypt.hash('Teacher123!', 10);
      teacher = await User.create({
        username: 'Teacher',
        email: teacherEmail,
        password: hashedPassword,
        age: 28,
        parentOrChild: 'הורה',
        favoriteHobbies: ['אומנות ומוזיקה'],
        gender: 'female',
        role: 'teacher',
        enrolledCourses: [],
        courseProgress: [],
        quizResults: [],
      });
      console.log('✅ Default teacher created:', teacherEmail);
    }

    const existingCourses = await Course.countDocuments();
    if (existingCourses === 0) {
      const starterCourses = [
        {
          title: 'English for Young Learners',
          description: 'קורס מומלץ לילדים ולמתחילים עם תרגילי שיחה, מילים בסיסיות ומשחקים חווייתיים.',
          category: 'english-for-kids',
          level: 'beginner',
          instructorId: teacher._id,
          isPublic: true,
          totalViews: 0,
          rating: 4.7,
        },
        {
          title: 'Everyday English Vocabulary',
          description: 'קורס מילים וביטויים שימושיים לחיי היום-יום באנגלית עם דוגמאות פשוטות.',
          category: 'vocabulary-everyday',
          level: 'beginner',
          instructorId: teacher._id,
          isPublic: true,
          totalViews: 0,
          rating: 4.5,
        },
        {
          title: 'Grammar Confidence',
          description: 'קורס דקדוק קלאסי עם הסברים ברורים ותרגילים תנאי להבנה בטוחה.',
          category: 'grammar-basics',
          level: 'intermediate',
          instructorId: teacher._id,
          isPublic: true,
          totalViews: 0,
          rating: 4.6,
        }
      ];

      const createdCourses = await Course.insertMany(starterCourses);
      console.log('✅ Sample courses created:', createdCourses.map(c => c.title).join(', '));

      const quiz = await Quiz.create({
        title: 'Basic English Quiz',
        description: 'בחן קצר למתחילים שכולל דקדוק, מילים והבנת הנקרא.',
        courseId: createdCourses[0]._id,
        englishLevel: 'beginner',
        quizType: 'mixed',
        questions: [
          {
            question: 'Choose the correct sentence.',
            questionType: 'multiple-choice',
            options: ['She go to school.', 'She goes to school.', 'She going to school.'],
            correctAnswer: 'She goes to school.',
            explanation: 'השימוש הנכון בזמן הווה פשוט בגוף שלישי יחיד הוא goes.',
            points: 2,
            difficulty: 'easy'
          },
          {
            question: 'Select the right word: I ___ a book.',
            questionType: 'multiple-choice',
            options: ['am', 'is', 'are'],
            correctAnswer: 'am',
            explanation: 'I uses am.',
            points: 2,
            difficulty: 'easy'
          },
          {
            question: 'Translate: שלום',
            questionType: 'short-answer',
            correctAnswer: 'hello',
            explanation: 'Hello means שלום in English.',
            points: 2,
            difficulty: 'easy'
          }
        ],
        duration: 15,
        passingScore: 60,
        createdBy: teacher._id,
        isActive: true,
      });

      createdCourses[0].quizzes.push(quiz._id);

      const courseVideoName = 'video-1772931315367.MP4';
      const videoPath = `uploads/videos/${courseVideoName}`;
      const videoStats = fs.existsSync(videoPath) ? fs.statSync(videoPath) : null;

      const lesson = await Lesson.create({
        instructorId: teacher._id,
        title: 'Welcome to English for Young Learners',
        description: 'שיעור מבוא חווייתי עם קטע וידאו קצר ללמידת מילים ראשוניות.',
        videoUrl: videoPath,
        videoFileName: courseVideoName,
        videoFileSize: videoStats ? videoStats.size : 0,
        isPublic: true,
      });

      const sampleSong = await Song.create({
        theme: 'Basic English Song',
        duration: '3:30',
        level: 'beginner',
        targetAge: '6-10',
        composer: 'Teacher Bot',
        lyricist: 'Teacher Bot',
        audioFileName: '1770208643241-ColorfulCake.mp3',
        uploadedBy: teacher._id,
        lesson: lesson._id,
      });

      createdCourses[0].lessons.push(lesson._id);
      createdCourses[0].songs.push(sampleSong._id);
      await createdCourses[0].save();

      console.log('✅ Sample quiz created for course:', createdCourses[0].title);
      console.log('✅ Sample lesson and song attached to course:', createdCourses[0].title);
    }
  } catch (error) {
    console.error('❌ Error seeding default data:', error);
  }
};
