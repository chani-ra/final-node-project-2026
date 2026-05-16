// routes/course.route.js
import { Router } from 'express';
import CourseController from '../controllers/courses.controller.js';
import { authenticateToken, requireTeacher } from '../middlewares/auth.middleware.js';

const router = Router();

// 🔍 Debug middleware
router.use((req, res, next) => {
  console.log(`📍 Courses Route: ${req.method} ${req.path}`);
  next();
});

// 🏫 מורים
router.post('/create', authenticateToken, requireTeacher, CourseController.createCourse);
router.put('/:courseId', authenticateToken, requireTeacher, CourseController.updateCourse);
router.delete('/:courseId', authenticateToken, requireTeacher, CourseController.deleteCourse);


// 🔍 חיפוש וצפייה
router.get('/', CourseController.searchCourses);
router.get('/search', CourseController.searchCourses);
router.get('/enrolled', authenticateToken, CourseController.getEnrolledCourses);
router.get('/instructor/:instructorId', CourseController.getInstructorCourses);
router.get('/recommended', authenticateToken, CourseController.getRecommendedCourses);
router.get('/:courseId', CourseController.getCourseById);

// ➕ תוכן
router.post('/:courseId/add-lesson', authenticateToken, requireTeacher, CourseController.addLessonToCourse);
router.post('/:courseId/add-song', authenticateToken, requireTeacher, CourseController.addSongToCourse);
router.post('/:courseId/add-exercise', authenticateToken, requireTeacher, CourseController.addExerciseToCourse);
router.post('/:courseId/add-quiz', authenticateToken, requireTeacher, CourseController.addQuizToCourse);


// 👤 סטודנטים
router.post('/:courseId/enroll', authenticateToken, CourseController.enrollStudent);

export default router;