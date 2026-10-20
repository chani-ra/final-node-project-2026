// Isolated Batch 3 service integration tests.
// Independent file: avoids modifying existing integration.test.js and its line endings.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';
process.env.CLIENT_ORIGINS = 'http://localhost:5173';
process.env.ADMIN_SETUP_KEY = 'test-admin-key';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.OPENAI_API_KEY = 'test-openai-key';

const { default: app } = await import('../app.js');
const { default: User } = await import('../models/users.model.js');
const { default: Course } = await import('../models/course.model.js');
const { default: CourseService } = await import('../service/courses.service.js');
const { default: TokenService } = await import('../service/token.service.js');

let mongoServer;

const registrationData = {
  username: 'Test Student',
  password: '123456',
  phone: '0500000000',
  age: 20,
  gender: 'female',
  parentOrChild: 'child',
  favoriteHobbies: ['books'],
  expectations: ['grammar'],
  englishLevel: 'beginner',
};

const createLessonTestUser = async (role, email) => {
  const user = await User.create({ ...registrationData, email, role });
  return {
    user,
    token: TokenService.generateAccessToken(user._id.toString(), role),
  };
};

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  for (const collection of Object.values(mongoose.connection.collections)) {
    await collection.deleteMany({});
  }
});

after(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

// Batch 3: CourseService quality refactor regression coverage.
// Content methods are currently service-only; do not introduce unreviewed routes.
const courseContentCases = [
  { method: 'addLessonToCourse', field: 'lessons', message: 'שיעור התווסף בהצלחה', denied: 'אתה לא מורשה לעדכן קורס זה או שהשיעור כבר קיים' },
  { method: 'addSongToCourse', field: 'songs', message: 'שיר התווסף בהצלחה', denied: 'אתה לא מורשה לעדכן קורס זה או שהשיר כבר קיים' },
  { method: 'addExerciseToCourse', field: 'exercises', message: 'תרגיל התווסף בהצלחה', denied: 'אתה לא מורשה לעדכן קורס זה או שהתרגיל כבר קיים' },
  { method: 'addQuizToCourse', field: 'quizzes', message: 'בחן התווסף בהצלחה', denied: 'אתה לא מורשה לעדכן קורס זה או שהבוחן כבר קיים' },
];

test('course content attachment retains all four success messages and $addToSet behavior', async () => {
  const { user: owner } = await createLessonTestUser('teacher', 'batch3-content-owner@test.com');
  const course = await Course.create({
    title: 'Batch 3 content regression', instructorId: owner._id, category: 'grammar',
  });

  for (const { method, field, message } of courseContentCases) {
    const contentId = new mongoose.Types.ObjectId();
    const first = await CourseService[method](course.id, contentId, owner.id);
    assert.equal(first.message, message);
    assert.equal(first.course[field].length, 1);
    assert.equal(first.course[field][0].toString(), contentId.toString());

    // The original methods use $addToSet: reattaching the same ID succeeds without duplicates.
    const second = await CourseService[method](course.id, contentId, owner.id);
    assert.equal(second.message, message);
    assert.equal(second.course[field].length, 1);
  }

  const stored = await Course.findById(course.id);
  for (const { field } of courseContentCases) {
    assert.equal(stored[field].length, 1);
  }
});

test('course content attachment preserves distinct 404 and 403 errors for each type', async () => {
  const { user: owner } = await createLessonTestUser('teacher', 'batch3-errors-owner@test.com');
  const { user: outsider } = await createLessonTestUser('teacher', 'batch3-errors-other@test.com');
  const course = await Course.create({
    title: 'Batch 3 denied actions', instructorId: owner._id, category: 'grammar',
  });

  for (const { method, field, denied } of courseContentCases) {
    const contentId = new mongoose.Types.ObjectId();
    await assert.rejects(
      CourseService[method](course.id, contentId, outsider.id),
      (error) => error.status === 403 && error.message === denied
    );
    await assert.rejects(
      CourseService[method](new mongoose.Types.ObjectId(), contentId, owner.id),
      (error) => error.status === 404 && error.message === 'קורס לא נמצא'
    );
    assert.equal((await Course.findById(course.id))[field].length, 0);
  }
});

test('course update and deletion routes still require a teacher/admin and enforce ownership', async () => {
  const { user: owner, token: ownerToken } = await createLessonTestUser('teacher', 'batch3-route-owner@test.com');
  const { token: otherToken } = await createLessonTestUser('teacher', 'batch3-route-other@test.com');
  const { token: studentToken } = await createLessonTestUser('student', 'batch3-route-student@test.com');
  const { token: adminToken } = await createLessonTestUser('admin', 'batch3-route-admin@test.com');
  const course = await Course.create({
    title: 'Batch 3 management regression', instructorId: owner._id, category: 'grammar',
  });
  const endpoint = `/courses/${course.id}`;

  const put = (token) => request(app).put(endpoint)
    .set('Authorization', `Bearer ${token}`).send({ title: 'Updated title' });
  const del = (token) => request(app).delete(endpoint)
    .set('Authorization', `Bearer ${token}`);

  assert.equal((await put(studentToken)).status, 403);
  assert.equal((await put(otherToken)).status, 403);
  assert.equal((await del(studentToken)).status, 403);
  assert.equal((await del(otherToken)).status, 403);

  const ownerUpdate = await put(ownerToken);
  assert.equal(ownerUpdate.status, 200);
  assert.equal(ownerUpdate.body.course.title, 'Updated title');

  // Admin management is intentionally allowed by the unchanged route/service contract.
  assert.equal((await del(adminToken)).status, 200);
  assert.equal(await Course.findById(course.id), null);
});
