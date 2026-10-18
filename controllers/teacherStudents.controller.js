import Course from "../models/course.model.js";
import CourseProgress from "../models/courseProgress.model.js";

// A teacher may see only students enrolled in courses that teacher owns.
// The endpoint intentionally does not expose users' emails, phones or passwords.
export async function getTeacherStudents(req, res, next) {
  try {
    const courses = await Course.find({ instructorId: req.user.id, createdFor: null })
      .select("title enrolledStudents")
      .populate({ path: "enrolledStudents", select: "username age role" })
      .lean();

    const rows = courses.flatMap((course) =>
      (course.enrolledStudents || [])
        .filter((student) => student && student.role === "student")
        .map((student) => ({
          id: `${course._id}:${student._id}`,
          studentId: student._id.toString(),
          courseId: course._id.toString(),
          name: student.username,
          age: student.age,
          course: course.title,
        }))
    );

    if (!rows.length) return res.json({ success: true, students: [], count: 0 });

    const progress = await CourseProgress.find({
      course: { $in: courses.map((course) => course._id) },
      user: { $in: [...new Set(rows.map((row) => row.studentId))] },
    }).select("user course progressPercent lastActivityAt").lean();

    const progressByEnrollment = new Map(progress.map((item) => [
      `${item.course}:${item.user}`, item,
    ]));

    const students = rows.map((row) => {
      const progressItem = progressByEnrollment.get(`${row.courseId}:${row.studentId}`);
      return {
        ...row,
        progress: progressItem?.progressPercent ?? 0,
        lastActivityAt: progressItem?.progressPercent > 0 ? progressItem.lastActivityAt : null,
      };
    });

    return res.json({ success: true, students, count: students.length });
  } catch (error) {
    next(error);
  }
}
