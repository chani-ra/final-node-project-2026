import { Router } from 'express';
// מייבאים ישירות את ה-default בדיוק כמו שהגדרת בסוף הקונטרולר
import CourseController from '../controllers/courses.controller.js'; 
import { authenticateToken, requireTeacher } from '../middlewares/auth.middleware.js';

const router = Router();

// 🔍 Debug middleware
router.use((req, res, next) => {
    console.log(`📍 Courses Route: ${req.method} ${req.path}`);
    next();
});

router.post(
  '/:courseId/refresh-personalized',
  authenticateToken,
  CourseController.refreshPersonalizedCourse
);
// ==========================================
// 1️⃣ נתיבים סטטיים קודם (חובה!)
// ==========================================
router.get('/enrolled', authenticateToken, CourseController.getEnrolledCourses);
router.get('/recommended', authenticateToken, CourseController.getRecommendedCourses);

// ==========================================
// 2️⃣ פעולות מורים (נתיבים קבועים)
// ==========================================
router.post('/create', authenticateToken, requireTeacher, CourseController.createCourse);

router.post(
  '/create-personalized',
  authenticateToken,
  CourseController.createPersonalizedCourse
);
// ==========================================
// 3️⃣ נתיבים דינמיים בסוף (עם נקודתיים : )
// ==========================================
router.get('/:courseId', CourseController.getCourseById);
router.put('/:courseId', authenticateToken, requireTeacher, CourseController.updateCourse);
router.delete('/:courseId', authenticateToken, requireTeacher, CourseController.deleteCourse);

// 👤 הרשמת סטודנט לקורס (התאמה לשם הפונקציה בקונטרולר שלך)
router.post('/:courseId/enroll', authenticateToken, CourseController.enrollInCourse);


// ==========================================
// ⚠️ נתיבים בהערה - פונקציות שלא קיימות בקונטרולר
// ==========================================
// router.get('/', CourseController.searchCourses);
// router.get('/search', CourseController.searchCourses);
// router.get('/instructor/:instructorId', CourseController.getInstructorCourses);
// router.post('/:courseId/add-lesson', authenticateToken, requireTeacher, CourseController.addLessonToCourse);
// router.post('/:courseId/add-song', authenticateToken, requireTeacher, CourseController.addSongToCourse);
// router.post('/:courseId/add-exercise', authenticateToken, requireTeacher, CourseController.addExerciseToCourse);
// router.post('/:courseId/add-quiz', authenticateToken, requireTeacher, CourseController.addQuizToCourse);

export default router;