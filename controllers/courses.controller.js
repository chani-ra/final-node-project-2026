// Public compatibility facade: routes and external callers keep the same import.
// Handlers are grouped by responsibility without changing their signatures.
import { catalogCourseController } from './courses/catalog.controller.js';
import { managementCourseController } from './courses/management.controller.js';
import { contentCourseController } from './courses/content.controller.js';
import { personalizedCourseController } from './courses/personalized.controller.js';

export const CourseController = {
  ...catalogCourseController,
  ...managementCourseController,
  ...contentCourseController,
  ...personalizedCourseController,
};

export default CourseController;
