import { Router } from "express";
import {
  initializeProgress,
  updateLectureProgress,
  updateQuizProgress,
  getStudentProgress,
  getStudentOverview,
  getModuleProgress,
  generateCertificate,
  getCourseAnalytics
} from "../controllers/progress.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { isInstructor } from "../middleware/role.middleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Student routes
router.route("/overview")
  .get(getStudentOverview);

router.route("/courses/:courseId")
  .post(initializeProgress)
  .get(getStudentProgress);

router.route("/courses/:courseId/modules/:moduleId")
  .get(getModuleProgress);

router.route("/courses/:courseId/modules/:moduleId/lectures/:lectureId")
  .post(updateLectureProgress);

router.route("/courses/:courseId/modules/:moduleId/quizzes/:quizId")
  .post(updateQuizProgress);

router.route("/courses/:courseId/certificate")
  .post(generateCertificate);

// Instructor routes
router.route("/courses/:courseId/analytics")
  .get(isInstructor, getCourseAnalytics);

export default router;