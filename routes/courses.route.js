import { Router } from 'express';
// מייבאים ישירות את ה-default בדיוק כמו שהגדרת בסוף הקונטרולר
import CourseController from '../controllers/courses.controller.js'; 
import { authenticateToken, requireTeacher } from '../middlewares/auth.middleware.js';

const router = Router();

// 🔍 Debug middleware
router.use((req, res, next) => {
    console.log(` Courses Route: ${req.method} ${req.path}`);
    next();
});

router.post(
  '/:courseId/refresh-personalized',
  authenticateToken,
  CourseController.refreshPersonalizedCourse
);
router.get('/enrolled', authenticateToken, CourseController.getEnrolledCourses);
router.get('/recommended', authenticateToken, CourseController.getRecommendedCourses);

//  פעולות מורים (נתיבים קבועים)
router.post('/create', authenticateToken, requireTeacher, CourseController.createCourse);

router.post(
  '/create-personalized',
  authenticateToken,
  CourseController.createPersonalizedCourse
);

// 
router.get(
  '/:courseId',
  authenticateToken,
  CourseController.getCourseById
);
router.put('/:courseId',
   authenticateToken, requireTeacher, CourseController.updateCourse);
router.delete('/:courseId', authenticateToken, requireTeacher, CourseController.deleteCourse);

// 
router.post('/:courseId/enroll', authenticateToken, CourseController.enrollInCourse);




export default router;