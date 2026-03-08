// routes/course.route.js
import { Router } from 'express';
import CourseController from '../controllers/courses.controller.js';
import { authenticateToken, requireTeacher } from '../middlewares/auth.middleware.js';

const router = Router();

// 🏫 מורים
router.post('/create', authenticateToken, requireTeacher, CourseController.createCourse);
router.put('/:courseId', authenticateToken, requireTeacher, CourseController.updateCourse);
router.delete('/:courseId', authenticateToken, requireTeacher, CourseController.deleteCourse);

// ➕ תוכן
router.post('/:courseId/add-lesson', authenticateToken, requireTeacher, CourseController.addLessonToCourse);
router.post('/:courseId/add-song', authenticateToken, requireTeacher, CourseController.addSongToCourse);
router.post('/:courseId/add-exercise', authenticateToken, requireTeacher, CourseController.addExerciseToCourse);
router.post('/:courseId/add-quiz', authenticateToken, requireTeacher, CourseController.addQuizToCourse);

// 🔍 חיפוש וצפייה
router.get('/search', CourseController.searchCourses);
router.get('/:courseId', CourseController.getCourseById);
router.get('/instructor/:instructorId', CourseController.getInstructorCourses);

// 👤 סטודנטים
router.get('/recommended', authenticateToken, CourseController.getRecommendedCourses);
router.post('/:courseId/enroll', authenticateToken, CourseController.enrollStudent);

export default router;