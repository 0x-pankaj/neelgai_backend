import { Router } from "express";
import {
  createQuiz,
  addQuestion,
  startQuizAttempt,
  submitQuizAttempt,
  updateQuiz,
  publishQuiz,
  getQuizById,
  getQuizAttempts,
  getQuizStatistics
} from "../controllers/quiz.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { isInstructor } from "../middleware/role.middleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Student routes
router.route("/:quizId")
  .get(getQuizById);
 
router.route("/:quizId/attempt")
  .post(startQuizAttempt);

router.route("/:quizId/attempt/:attemptId/submit")
  .post(submitQuizAttempt);

router.route("/:quizId/attempts")
  .get(getQuizAttempts);

// Instructor routes
router.use(isInstructor);

router.route("/")
  .post(createQuiz);

router.route("/:quizId")
  .patch(updateQuiz);

router.route("/:quizId/questions")
  .post(addQuestion);

router.route("/:quizId/publish")
  .patch(publishQuiz);

router.route("/:quizId/statistics")
  .get(getQuizStatistics);

export default router;