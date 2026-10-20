import { test } from 'node:test';
import assert from 'node:assert/strict';
import CourseController, { CourseController as namedController } from '../controllers/courses.controller.js';
import { catalogCourseController } from '../controllers/courses/catalog.controller.js';
import { managementCourseController } from '../controllers/courses/management.controller.js';
import { contentCourseController } from '../controllers/courses/content.controller.js';
import { personalizedCourseController } from '../controllers/courses/personalized.controller.js';

test('legacy CourseController facade exposes each handler exactly once', () => {
  const modules = [
    catalogCourseController,
    managementCourseController,
    contentCourseController,
    personalizedCourseController,
  ];
  const allNames = modules.flatMap((handlers) => Object.keys(handlers));
  assert.equal(allNames.length, 14);
  assert.equal(new Set(allNames).size, allNames.length);
  assert.deepEqual(Object.keys(CourseController).sort(), [...allNames].sort());
  assert.strictEqual(CourseController, namedController);
  for (const handlers of modules) {
    for (const [name, handler] of Object.entries(handlers)) {
      assert.equal(typeof handler, 'function');
      assert.strictEqual(CourseController[name], handler);
    }
  }
});
