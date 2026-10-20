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
const { default: ExerciseAttempt } = await import("../models/exerciseAttempt.model.js");
const { exerciseGrader } = await import("../service/exerciseGrading.service.js");
const { default: Quiz } = await import("../models/quiz.model.js");
const { default: Lesson } = await import("../models/lessons.model.js");
const { default: TokenService } = await import("../service/token.service.js");
const { default: ChatConversation } = await import("../models/chatConversation.model.js");
const { default: LearningPrompt } = await import("../models/learningPrompt.model.js");
const { seedLearningCatalog } = await import("../service/learning/catalog.service.js");
const { default: LearningCategory } = await import("../models/learningCategory.model.js");
const { generateLearningLesson } = await import("../service/learning/learning.service.js");

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

test("lesson preview permits owner teacher and admin, denies other users", async () => {
  const teacher = await User.create({
    ...registrationData,
    email: "lesson-owner@test.com",
    role: "teacher",
  });
  const otherTeacher = await User.create({
    ...registrationData,
    email: "another-teacher@test.com",
    role: "teacher",
  });
  const student = await User.create({
    ...registrationData,
    email: "lesson-student@test.com",
    role: "student",
  });
  const admin = await User.create({
    ...registrationData,
    email: "lesson-admin@test.com",
    role: "admin",
  });
  const lesson = await Lesson.create({
    instructorId: teacher._id,
    title: "Private lesson preview test",
    videoUrl: "/uploads/videos/preview-test.mp4",
    videoFileName: "preview-test.mp4",
    videoFileSize: 20,
    isPublic: false,
  });
  const endpoint = `/lessons/manage/${lesson._id}`;
  const asRole = (user) =>
    request(app)
      .get(endpoint)
      .set("Authorization", `Bearer ${TokenService.generateAccessToken(user._id, user.role)}`);

  const ownerResponse = await asRole(teacher);
  assert.equal(ownerResponse.status, 200);
  assert.equal(ownerResponse.body.success, true);
  assert.equal(ownerResponse.body.lesson.instructorId._id, teacher._id.toString());
  assert.equal(TokenService.verifyToken(ownerResponse.body.previewToken).type, "lesson-preview");

  assert.equal((await asRole(otherTeacher)).status, 403);
  assert.equal((await asRole(student)).status, 403);
  assert.equal((await asRole(admin)).status, 200);
});

test("exercise completion requires a course and updates progress safely", async () => {
  const registration = await registerStudent();
  const token = registration.body.token;
  const user = await User.findOne({ email: registrationData.email });
  const course = await Course.findById(registration.body.personalizedCourse.id);

  const exercise = await Exercise.create({
    title: "Course exercise",
    instructions: "1. Write a sentence.",
    createdBy: user._id,
    isPublic: false,
  });

  course.exercises = [exercise._id];
  await course.save();

  const endpoint = "/exercises/" + exercise._id + "/complete";
  const auth = (req) => req.set("Authorization", "Bearer " + token);

  const noBody = await auth(request(app).post(endpoint));
  assert.equal(noBody.status, 400);
  assert.equal(noBody.body.message, "מזהה קורס חובה");

  const completed = await auth(request(app).post(endpoint))
    .send({ courseId: course._id.toString() });

  assert.equal(completed.status, 200);
  assert.equal(completed.body.progress.progressPercent, 100);
  assert.equal(completed.body.progress.completedExercises.length, 1);

  const again = await auth(request(app).post(endpoint))
    .send({ courseId: course._id.toString() });

  assert.equal(again.status, 200);
  assert.equal(again.body.progress.completedExercises.length, 1);

  const anotherStudent = await registerStudent({
    email: "other-student@test.com",
  });

  const denied = await request(app)
    .post(endpoint)
    .set("Authorization", "Bearer " + anotherStudent.body.token)
    .send({ courseId: course._id.toString() });

  assert.equal(denied.status, 403);
});

test("legacy exercise missing creator is readable through its enrolled course", async () => {
  const registration = await registerStudent();
  const token = registration.body.token;
  const user = await User.findOne({ email: registrationData.email });
  const course = await Course.findById(registration.body.personalizedCourse.id);

  const exercise = await Exercise.create({
    title: "Legacy exercise",
    createdBy: user._id,
    isPublic: false,
  });

  await Course.findByIdAndUpdate(course._id, {
    $addToSet: { exercises: exercise._id },
  });

  await Exercise.collection.updateOne(
    { _id: exercise._id },
    { $unset: { createdBy: "" } }
  );

  const response = await request(app)
    .get("/exercises/" + exercise._id)
    .set("Authorization", "Bearer " + token);

  assert.equal(response.status, 200);
  assert.equal(response.body.exercise._id, exercise._id.toString());
});

test("exercise submission grades, saves answers and restores latest result", async () => {
  const registration = await registerStudent();
  const token = registration.body.token;
  const student = await User.findOne({
    email: registrationData.email,
  });
  const courseId = registration.body.personalizedCourse.id;

  const exercise = await Exercise.create({
    title: "Answer test",
    instructions: "1. She ___ happy.",
    createdBy: student._id,
  });

  await Course.findByIdAndUpdate(courseId, {
    $addToSet: { exercises: exercise._id },
  });

  const original = exerciseGrader.grade;
  exerciseGrader.grade = async () => [
    { correct: true, feedback: "נכון" },
  ];

  try {
    const endpoint = "/exercises/" + exercise.id;
    const auth = (req) =>
      req.set("Authorization", "Bearer " + token);

    const submitted = await auth(
      request(app).post(endpoint + "/submit")
    ).send({ courseId, answers: ["is"] });

    assert.equal(submitted.status, 200);
    assert.equal(submitted.body.attempt.status, "graded");
    assert.equal(submitted.body.attempt.score, 100);

    const latest = await auth(
      request(app)
        .get(endpoint + "/submission")
        .query({ courseId })
    );

    assert.equal(latest.status, 200);
    assert.equal(latest.body.attempt.answers[0].answer, "is");
    assert.equal(latest.body.attempt.answers[0].correct, true);

    assert.equal(
      await ExerciseAttempt.countDocuments({ user: student.id }),
      1
    );

    const progress = await CourseProgress.findOne({
      user: student.id,
      course: courseId,
    });

    assert.equal(progress.completedExercises.length, 1);
  } finally {
    exerciseGrader.grade = original;
  }
});

test("exercise submission protects enrollment and keeps answers if AI fails", async () => {
  const first = await registerStudent();
  const second = await registerStudent({
    email: "second-exercise-student@test.com",
  });

  const courseId = first.body.personalizedCourse.id;
  const student = await User.findOne({
    email: registrationData.email,
  });

  const exercise = await Exercise.create({
    title: "Pending test",
    instructions: "1. Give one example",
    createdBy: student.id,
  });

  await Course.findByIdAndUpdate(courseId, {
    $addToSet: { exercises: exercise.id },
  });

  const endpoint = "/exercises/" + exercise.id + "/submit";

  const denied = await request(app)
    .post(endpoint)
    .set("Authorization", "Bearer " + second.body.token)
    .send({ courseId, answers: ["example"] });

  assert.equal(denied.status, 403);

  const original = exerciseGrader.grade;
  exerciseGrader.grade = async () => {
    throw Error("AI offline");
  };

  try {
    const saved = await request(app)
      .post(endpoint)
      .set("Authorization", "Bearer " + first.body.token)
      .send({ courseId, answers: ["example"] });

    assert.equal(saved.status, 200);
    assert.equal(saved.body.attempt.status, "pending");
    assert.equal(saved.body.attempt.answers[0].answer, "example");
    assert.equal(saved.body.attempt.score, null);
  } finally {
    exerciseGrader.grade = original;
  }
});


test("teacher AI exercise questions reach the student without answers", async () => {
  await registerStudent();

  const teacher = await User.findOne({
    email: registrationData.email,
  });

  teacher.role = "teacher";
  await teacher.save();

  const teacherToken = TokenService.generateAccessToken(
    teacher._id,
    "teacher"
  );

  const questions = [
    "What is your favorite hobby?",
    "Describe your best friend.",
  ];

  const created = await request(app)
    .post("/exercises/create")
    .set("Authorization", "Bearer " + teacherToken)
    .send({
      title: "Two Open Questions",
      instructions: "Answer the two questions in English.",
      isPublic: true,
      createdByAI: true,
      questions,
      answerKey: [
        {
          answer: "I like reading.",
          mode: "flexible",
        },
        {
          answer: "My friend is kind.",
          mode: "flexible",
        },
      ],
    });

  assert.equal(
    created.status,
    201,
    JSON.stringify(created.body)
  );

  assert.deepEqual(
    created.body.exercise.questions,
    questions
  );

  const studentRegistration = await registerStudent({
    email: "question-student@test.com",
  });

  const studentCourse = await Course.findById(
    studentRegistration.body.personalizedCourse.id
  );

  studentCourse.exercises = [
    created.body.exercise._id,
  ];

  await studentCourse.save();

  const loaded = await request(app)
    .get("/exercises/" + created.body.exercise._id)
    .set(
      "Authorization",
      "Bearer " + studentRegistration.body.token
    );

  assert.equal(
    loaded.status,
    200,
    JSON.stringify(loaded.body)
  );

  assert.deepEqual(
    loaded.body.exercise.questions,
    questions
  );

  assert.equal(
    "answerKey" in loaded.body.exercise,
    false
  );

  assert.equal(
    "correctAnswer" in loaded.body.exercise,
    false
  );

  const refused = await request(app)
    .post("/exercises/create")
    .set("Authorization", "Bearer " + teacherToken)
    .send({
      title: "Broken AI Exercise",
      createdByAI: true,
      instructions: "Intro only",
    });

  assert.equal(refused.status, 400);
});


// AI Learning Studio: real API + isolated MongoDB, with no external AI calls.
test("AI learning catalog is accessible only to authenticated users", async () => {
  await seedLearningCatalog();
  await seedLearningCatalog(); // Seeding is safe to repeat.
  assert.equal(await LearningCategory.countDocuments(), 5);

  const unauthenticated = await request(app).get("/learning/categories");
  assert.equal(unauthenticated.status, 401);

  const registration = await registerStudent();
  const authorized = await request(app)
    .get("/learning/categories")
    .set("Authorization", `Bearer ${registration.body.token}`);
  assert.equal(authorized.status, 200);
  assert.equal(authorized.body.categories.length, 5);
  assert.ok(authorized.body.categories.every((cat) => cat.subcategories.length > 0));

  const providers = await request(app)
    .get("/learning/providers")
    .set("Authorization", `Bearer ${registration.body.token}`);
  assert.equal(providers.status, 200);
  assert.equal(providers.body.providers.length, 2);
  assert.equal(JSON.stringify(providers.body).includes("test-openai-key"), false);
});

test("AI lesson is saved with category, prompt, and provider; student can reopen it", async () => {
  await seedLearningCatalog();
  const registration = await registerStudent();
  const user = await User.findOne({ email: registrationData.email });
  const categories = await request(app)
    .get("/learning/categories")
    .set("Authorization", `Bearer ${registration.body.token}`);
  const grammar = categories.body.categories.find((cat) => cat.slug === "grammar");
  assert.ok(grammar);
  const pastSimple = grammar.subcategories.find((sub) => sub.slug === "past-simple");
  assert.ok(pastSimple);

  // Inject an AI response only in the test: no real API keys or network calls.
  const saved = await generateLearningLesson({
    userId: user._id,
    categoryId: grammar._id,
    subcategoryId: pastSimple._id,
    prompt: "Teach me the Past Simple",
    provider: "openai",
  }, { generate: async ({ provider, instructions, prompt }) => {
    assert.equal(provider, "openai");
    assert.match(instructions, /Past Simple/);
    assert.equal(prompt, "Teach me the Past Simple");
    return { provider, model: "test-double", response: "# Past Simple\nI walked yesterday." };
  } });

  assert.equal(await LearningPrompt.countDocuments({ user: user._id }), 1);
  assert.equal(saved.provider, "openai");
  assert.equal(saved.model, "test-double");
  assert.equal(saved.response, "# Past Simple\nI walked yesterday.");

  const history = await request(app)
    .get("/learning/history?page=1&limit=8")
    .set("Authorization", `Bearer ${registration.body.token}`);
  assert.equal(history.status, 200);
  assert.equal(history.body.total, 1);
  assert.equal(history.body.items[0].category.slug, "grammar");
  assert.equal(history.body.items[0].subcategory.slug, "past-simple");
  assert.equal(history.body.items[0].provider, "openai");

  const detail = await request(app)
    .get(`/learning/history/${saved._id}`)
    .set("Authorization", `Bearer ${registration.body.token}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.lesson.response, saved.response);
});

test("learning history is private to the student; admin can see all", async () => {
  await seedLearningCatalog();
  const first = await registerStudent();
  const second = await registerStudent({ email: "other-student@test.com" });
  const firstUser = await User.findOne({ email: registrationData.email });
  const secondUser = await User.findOne({ email: "other-student@test.com" });
  const admin = await User.create({
    ...registrationData, username: "Admin Test", email: "admin-test@test.com", role: "admin",
  });
  const category = await LearningCategory.findOne({ slug: "grammar" });
  const { default: LearningSubcategory } = await import("../models/learningSubcategory.model.js");
  const subcategory = await LearningSubcategory.findOne({ category: category._id });
  const docs = await LearningPrompt.create([
    { user: firstUser._id, category: category._id, subcategory: subcategory._id,
      prompt: "First student question", response: "Answer one", level: "beginner", provider: "gemini", model: "mock" },
    { user: secondUser._id, category: category._id, subcategory: subcategory._id,
      prompt: "Second student question", response: "Answer two", level: "beginner", provider: "gemini", model: "mock" },
  ]);

  const firstHistory = await request(app)
    .get("/learning/history")
    .set("Authorization", `Bearer ${first.body.token}`);
  assert.equal(firstHistory.status, 200);
  assert.equal(firstHistory.body.total, 1);
  assert.equal(firstHistory.body.items[0].prompt, "First student question");

  const otherDetail = await request(app)
    .get(`/learning/history/${docs[1]._id}`)
    .set("Authorization", `Bearer ${first.body.token}`);
  assert.equal(otherDetail.status, 404);

  const forbiddenHistory = await request(app)
    .get(`/learning/history?userId=${secondUser._id}`)
    .set("Authorization", `Bearer ${first.body.token}`);
  assert.equal(forbiddenHistory.status, 400);

  const adminUnauthorized = await request(app)
    .get("/learning/admin/history")
    .set("Authorization", `Bearer ${second.body.token}`);
  assert.equal(adminUnauthorized.status, 403);

  const adminToken = TokenService.generateAccessToken(admin._id, "admin");
  const adminHistory = await request(app)
    .get("/learning/admin/history?page=1&limit=1")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(adminHistory.status, 200);
  assert.equal(adminHistory.body.total, 2);
  assert.equal(adminHistory.body.items.length, 1);
  assert.equal(adminHistory.body.pages, 2);

  const filtered = await request(app)
    .get(`/learning/admin/history?userId=${secondUser._id}`)
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(filtered.status, 200);
  assert.equal(filtered.body.total, 1);
  assert.equal(filtered.body.items[0].prompt, "Second student question");
});

test("AI generation rejects mismatched category and subcategory without using AI", async () => {
  await seedLearningCatalog();
  const registration = await registerStudent();
  const categories = await request(app)
    .get("/learning/categories")
    .set("Authorization", `Bearer ${registration.body.token}`);
  const grammar = categories.body.categories.find((c) => c.slug === "grammar");
  const vocabulary = categories.body.categories.find((c) => c.slug === "vocabulary");
  const response = await request(app)
    .post("/learning/generate")
    .set("Authorization", `Bearer ${registration.body.token}`)
    .send({
      categoryId: grammar._id,
      subcategoryId: vocabulary.subcategories[0]._id,
      prompt: "Please teach me English vocabulary",
      provider: "gemini",
    });
  assert.equal(response.status, 400);
  assert.equal(await LearningPrompt.countDocuments(), 0);
});


const createChatTestUser = async (email) => {
  const user = await User.create({ ...registrationData, email });
  return { token: TokenService.generateAccessToken(user._id.toString(), "student") };
};

test("chat message endpoint rejects forged AI sender", async () => {
  const { token } = await createChatTestUser("forged-chat@test.com");
  const created = await request(app).post("/chat-conversations").set("Authorization", `Bearer ${token}`).send({ title: "Chat" });
  assert.equal(created.status, 201);

  const reply = await request(app)
    .post(`/chat-conversations/${created.body.conversation._id}/messages`)
    .set("Authorization", `Bearer ${token}`)
    .send({ sender: "ai", text: "Fake assistant response" });
  assert.equal(reply.status, 400);
  const saved = await ChatConversation.findById(created.body.conversation._id);
  assert.equal(saved.messages.length, 0);
});

test("chat server persists both roles and enforces conversation ownership", async () => {
  const first = await createChatTestUser("chat-owner@test.com");
  const second = await createChatTestUser("chat-stranger@test.com");
  const created = await request(app).post("/chat-conversations").set("Authorization", `Bearer ${first.token}`).send({});
  const id = created.body.conversation._id;
  const unauthorized = await request(app).post(`/chat-conversations/${id}/reply`)
    .set("Authorization", `Bearer ${second.token}`).send({ message: "123456789", level: "beginner" });
  assert.equal(unauthorized.status, 404);

  // Off-topic digits exercise the real server without making any external AI call.
  const result = await request(app).post(`/chat-conversations/${id}/reply`)
    .set("Authorization", `Bearer ${first.token}`).send({ message: "123456789", level: "beginner", sender: "ai", reply: "Fake" });
  assert.equal(result.status, 200);
  assert.equal(result.body.conversation.messages.length, 2);
  assert.equal(result.body.conversation.messages[0].sender, "user");
  assert.equal(result.body.conversation.messages[0].text, "123456789");
  assert.equal(result.body.conversation.messages[1].sender, "ai");
  assert.equal(result.body.conversation.messages[1].text, result.body.reply);
  assert.notEqual(result.body.reply, "Fake");
});

test("teacher students endpoint uses only owned course enrollments and real progress", async () => {
  const teacher = await User.create({ ...registrationData, email: "teacher-list@test.com", role: "teacher" });
  const otherTeacher = await User.create({ ...registrationData, email: "other-teacher@test.com", role: "teacher" });
  const student = await User.create({ ...registrationData, email: "enrolled-student@test.com" });
  const secondStudent = await User.create({ ...registrationData, email: "other-student@test.com" });

  const ownedCourse = await Course.create({
    title: "My English Course", instructorId: teacher._id, category: "grammar",
    enrolledStudents: [student._id],
  });
  await Course.create({
    title: "Somebody Else's Course", instructorId: otherTeacher._id, category: "grammar",
    enrolledStudents: [secondStudent._id],
  });
  await CourseProgress.create({ user: student._id, course: ownedCourse._id, progressPercent: 64 });

  const teacherToken = TokenService.generateAccessToken(teacher._id.toString(), "teacher");
  const studentToken = TokenService.generateAccessToken(student._id.toString(), "student");
  const response = await request(app).get("/courses/teacher/students")
    .set("Authorization", `Bearer ${teacherToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.count, 1);
  assert.equal(response.body.students[0].name, student.username);
  assert.equal(response.body.students[0].progress, 64);
  assert.equal(response.body.students[0].course, "My English Course");
  assert.equal("email" in response.body.students[0], false);
  assert.equal(response.body.students.some((row) => row.studentId === secondStudent._id.toString()), false);

  const forbidden = await request(app).get("/courses/teacher/students")
    .set("Authorization", `Bearer ${studentToken}`);
  assert.equal(forbidden.status, 403);

  const otherTeacherToken = TokenService.generateAccessToken(otherTeacher._id.toString(), "teacher");
  const otherResult = await request(app).get("/courses/teacher/students")
    .set("Authorization", `Bearer ${otherTeacherToken}`);
  assert.equal(otherResult.status, 200);
  assert.equal(otherResult.body.students.length, 1);
  assert.equal(otherResult.body.students[0].studentId, secondStudent._id.toString());
});

// Batch 1: CourseController refactoring regression coverage.
// These Course tests use DB fixtures; registration itself is covered above.
// Calling /users/register here exceeds the 20/hour registration limiter.
const createCourseTestStudent = async () => {
  const student = await User.create({ ...registrationData, role: "student" });
  const token = TokenService.generateAccessToken(student._id.toString(), "student");
  return { student, token };
};

// These exercise the unchanged public routes, not implementation details.
test("course discovery lists public courses and previews them without private content", async () => {
  const { student, token } = await createCourseTestStudent();

  const publicCourse = await Course.create({
    title: "Visible grammar lessons",
    description: "A public course",
    category: "grammar",
    instructorId: student._id,
    isPublic: true,
  });
  const privateCourse = await Course.create({
    title: "Hidden grammar lessons",
    description: "A private course",
    category: "grammar",
    instructorId: student._id,
    isPublic: false,
  });

  const discovery = await request(app)
    .get("/courses/discover?search=grammar&page=1&limit=10")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(discovery.status, 200);
  assert.equal(discovery.body.success, true);
  assert.ok(discovery.body.courses.some((course) => course._id === publicCourse.id));
  assert.equal(discovery.body.courses.some((course) => course._id === privateCourse.id), false);

  const preview = await request(app)
    .get(`/courses/${publicCourse.id}`)
    .set("Authorization", `Bearer ${token}`);
  assert.equal(preview.status, 200);
  assert.equal(preview.body.course.access, "preview");
  assert.equal(preview.body.course.isEnrolled, false);
  assert.equal("enrolledStudents" in preview.body.course, false);

  const denied = await request(app)
    .get(`/courses/${privateCourse.id}`)
    .set("Authorization", `Bearer ${token}`);
  assert.equal(denied.status, 403);
});

test("course creation remains teacher-only and preserves trimming and defaults", async () => {
  const { student, token } = await createCourseTestStudent();
  const courseData = { title: "  New teacher course  ", category: "grammar" };

  const denied = await request(app)
    .post("/courses/create")
    .set("Authorization", `Bearer ${token}`)
    .send(courseData);
  assert.equal(denied.status, 403);

  const teacher = student;
  teacher.role = "teacher";
  await teacher.save();
  const teacherToken = TokenService.generateAccessToken(teacher.id, "teacher");

  const invalid = await request(app)
    .post("/courses/create")
    .set("Authorization", `Bearer ${teacherToken}`)
    .send({ category: "grammar" });
  assert.equal(invalid.status, 400);

  const created = await request(app)
    .post("/courses/create")
    .set("Authorization", `Bearer ${teacherToken}`)
    .send(courseData);
  assert.equal(created.status, 201);
  assert.equal(created.body.success, true);
  assert.equal(created.body.course.title, "New teacher course");
  assert.equal(created.body.course.level, "beginner");
  assert.equal(created.body.course.isPublic, true);
});

test("enrollment preserves progress and duplicate-enrollment response", async () => {
  const { student, token } = await createCourseTestStudent();
  const course = await Course.create({
    title: "Public enrollment course",
    category: "grammar",
    instructorId: student._id,
    isPublic: true,
  });

  const enrolled = await request(app)
    .post(`/courses/${course.id}/enroll`)
    .set("Authorization", `Bearer ${token}`);
  assert.equal(enrolled.status, 200);
  assert.equal(enrolled.body.success, true);
  assert.equal(enrolled.body.courseId, course.id);
  assert.equal(enrolled.body.progressPercent, 0);

  const progress = await CourseProgress.findOne({ user: student._id, course: course._id });
  assert.ok(progress);

  const duplicate = await request(app)
    .post(`/courses/${course.id}/enroll`)
    .set("Authorization", `Bearer ${token}`);
  assert.equal(duplicate.status, 409);
});

test("personalized course rejects invalid level before calling the AI", async () => {
  const { token } = await createCourseTestStudent();

  const response = await request(app)
    .post("/courses/create-personalized")
    .set("Authorization", `Bearer ${token}`)
    .send({ englishLevel: "expert", favoriteHobbies: ["books"] });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "רמת אנגלית לא תקינה");
});
