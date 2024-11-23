import { Router } from "express";
import {
  getAdminDashboard,
  getInstructorDashboard,
  getStudentDashboard
} from "../controllers/dashboard.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { isAdmin, isInstructor } from "../middleware/role.middleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Admin dashboard route
router.route("/admin")
  .get(isAdmin, getAdminDashboard);

// Instructor dashboard route
router.route("/instructor")
  .get(isInstructor, getInstructorDashboard);

// Student dashboard route
router.route("/student")
  .get(getStudentDashboard);

export default router;