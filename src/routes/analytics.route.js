import { Router } from "express";
import {
  getPlatformAnalytics,
  getUserAnalytics,
  getCourseAnalytics,
  getInstructorAnalytics,
  updateAnalytics
} from "../controllers/analytics.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { isAdmin, isInstructor } from "../middleware/role.middleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Platform analytics routes (Admin only)
router.route("/platform")
  .get(isAdmin, getPlatformAnalytics);

// User analytics routes
router.route("/users/:userId")
  .get(getUserAnalytics);

// Course analytics routes (Instructor or Admin)
router.route("/courses/:courseId")
  .get(isInstructor, getCourseAnalytics);

// Instructor analytics routes
router.route("/instructors/:instructorId")
  .get(getInstructorAnalytics);

// Update analytics routes (Admin only)
router.route("/update/:type/:id?")
  .post(isAdmin, updateAnalytics);

export default router;