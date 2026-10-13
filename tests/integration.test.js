import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.REFRESH_SECRET = "test-refresh-secret";
process.env.CLIENT_ORIGINS = "http://localhost:5173";
process.env.ADMIN_SETUP_KEY = "test-admin-key";
process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.OPENAI_API_KEY = "test-openai-key";

const { default: app } = await import("../app.js");
const { default: User } = await import("../models/users.model.js");
const { default: Course } = await import("../models/course.model.js");
const { default: CourseProgress } = await import("../models/courseProgress.model.js");
const { default: Exercise } = await import("../models/exercise.model.js");
const { default: Quiz } = await import("../models/quiz.model.js");
const { default: TokenService } = await import("../service/token.service.js");

let mongoServer;

const registrationData = {
  username: "Test Student",
  email: "student@test.com",
  password: "123456",
  phone: "0500000000",
  age: 20,
  gender: "female",
  parentOrChild: "child",
  favoriteHobbies: ["books"],
  expectations: ["grammar"],
  englishLevel: "beginner",
};

const registerStudent = async (overrides = {}) => {
  return request(app)
    .post("/users/register")
    .send({ ...registrationData, ...overrides });
};

const createQuizForCourse = async (userId, courseId) => {
  const quiz = await Quiz.create({
    title: "Integration Quiz",
    courseId,
    englishLevel: "beginner",
    quizType: "grammar",
    questions: [
      {
        question: "Choose the correct answer",
        questionType: "multiple-choice",
        options: ["is", "are"],
        correctAnswer: "is",
        explanation: "Singular subject uses is.",
        points: 1,
      },
    ],
    passingScore: 70,
    duration: 10,
    isActive: true,
    isPublic: false,
    createdBy: userId,
  });

  await Course.findByIdAndUpdate(courseId, {
    $addToSet: { quizzes: quiz._id },
  });

  return quiz;
};

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  const collections = Object.values(mongoose.connection.collections);

  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

after(async () => {
  await mongoose.disconnect();

  if (mongoServer) {
    await mongoServer.stop();
  }
});

test("registration creates student, personalized course and progress", async () => {
  const response = await registerStudent();

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.user.role, "student");
  assert.ok(response.body.token);
  assert.ok(response.body.personalizedCourse?.id);

  const user = await User.findOne({ email: registrationData.email });
  assert.ok(user);

  const course = await Course.findById(response.body.personalizedCourse.id);
  assert.ok(course);

  assert.equal(course.createdFor.toString(), user._id.toString());
  assert.equal(course.createdByAI, true);
  assert.equal(course.isPublic, false);

  assert.ok(
    course.enrolledStudents.some(
      (studentId) => studentId.toString() === user._id.toString()
    )
  );

  assert.ok(
    user.enrolledCourses.some(
      (courseId) => courseId.toString() === course._id.toString()
    )
  );

  const progress = await CourseProgress.findOne({
    user: user._id,
    course: course._id,
  });

  assert.ok(progress);
  assert.equal(progress.progressPercent, 0);
});

test("registration cannot assign admin role from client", async () => {
  const response = await registerStudent({
    email: "role-test@test.com",
    role: "admin",
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.user.role, "student");

  const user = await User.findOne({ email: "role-test@test.com" });

  assert.ok(user);
  assert.equal(user.role, "student");
});

test("completing course item updates progress and stays idempotent", async () => {
  const registration = await registerStudent();

  assert.equal(registration.status, 201);

  const token = registration.body.token;
  const user = await User.findOne({ email: registrationData.email });
  const course = await Course.findById(registration.body.personalizedCourse.id);

  const exercise = await Exercise.create({
    title: "Test Exercise",
    description: "Integration test exercise",
    instructions: "Complete the exercise",
    type: "practice",
    category: "grammar",
    level: "beginner",
    isPublic: false,
    createdBy: user._id,
  });

  course.exercises = [exercise._id];
  course.lessons = [];
  course.songs = [];
  course.quizzes = [];
  await course.save();

  const firstResponse = await request(app)
    .patch(`/course-progress/${course._id}/item`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      itemType: "exercise",
      itemId: exercise._id.toString(),
      completed: true,
    });

  assert.equal(firstResponse.status, 200);
  assert.equal(firstResponse.body.progress.progressPercent, 100);
  assert.equal(firstResponse.body.progress.completedExercises.length, 1);

  const secondResponse = await request(app)
    .patch(`/course-progress/${course._id}/item`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      itemType: "exercise",
      itemId: exercise._id.toString(),
      completed: true,
    });

  assert.equal(secondResponse.status, 200);
  assert.equal(secondResponse.body.progress.progressPercent, 100);
  assert.equal(secondResponse.body.progress.completedExercises.length, 1);
});

test("cannot complete item that does not belong to course", async () => {
  const registration = await registerStudent();

  const token = registration.body.token;
  const user = await User.findOne({ email: registrationData.email });
  const course = await Course.findById(registration.body.personalizedCourse.id);

  const exercise = await Exercise.create({
    title: "Outside Exercise",
    type: "practice",
    category: "grammar",
    level: "beginner",
    isPublic: false,
    createdBy: user._id,
  });

  const response = await request(app)
    .patch(`/course-progress/${course._id}/item`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      itemType: "exercise",
      itemId: exercise._id.toString(),
      completed: true,
    });

  assert.equal(response.status, 400);

  const progress = await CourseProgress.findOne({
    user: user._id,
    course: course._id,
  });

  assert.equal(progress.completedExercises.length, 0);
  assert.equal(progress.progressPercent, 0);
});

test("student does not receive quiz correct answers", async () => {
  const registration = await registerStudent();

  const token = registration.body.token;
  const user = await User.findOne({ email: registrationData.email });
  const course = await Course.findById(registration.body.personalizedCourse.id);

  const quiz = await createQuizForCourse(user._id, course._id);

  const response = await request(app)
    .get(`/quizzes/${quiz._id}?courseId=${course._id}`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.quiz.questions.length, 1);

  const question = response.body.quiz.questions[0];

  assert.equal("correctAnswer" in question, false);
  assert.equal("explanation" in question, false);
  assert.deepEqual(question.options, ["is", "are"]);

  const storedQuiz = await Quiz.findById(quiz._id);

  assert.equal(storedQuiz.questions[0].correctAnswer, "is");
});

test("deleting course cleans enrollment, progress and quiz reference", async () => {
  const registration = await registerStudent();

  const user = await User.findOne({ email: registrationData.email });
  const course = await Course.findById(registration.body.personalizedCourse.id);
  const quiz = await createQuizForCourse(user._id, course._id);

  user.role = "teacher";
  await user.save();

  const teacherToken = TokenService.generateAccessToken(
    user._id,
    "teacher"
  );

  const response = await request(app)
    .delete(`/courses/${course._id}`)
    .set("Authorization", `Bearer ${teacherToken}`);

  assert.equal(response.status, 200);

  const deletedCourse = await Course.findById(course._id);
  assert.equal(deletedCourse, null);

  const progress = await CourseProgress.findOne({
    user: user._id,
    course: course._id,
  });

  assert.equal(progress, null);

  const updatedUser = await User.findById(user._id);

  assert.equal(
    updatedUser.enrolledCourses.some(
      (courseId) => courseId.toString() === course._id.toString()
    ),
    false
  );

  const updatedQuiz = await Quiz.findById(quiz._id);
  assert.equal(updatedQuiz.courseId, null);
});