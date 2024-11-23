import { Router } from "express";
import {
  createCourse,
  addModule,
  addLecture,
  addLectureResource,
  getCourseById,
  getAllCourses,
  updateCourse,
  publishCourse,
  addReview,
  markLectureComplete,
  getCourseProgress,
  getInstructorCourses,
  getEnrolledStudents
} from "../controllers/course.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import { isInstructor } from "../middleware/role.middleware.js";

const router = Router();

// Public routes
router.route("/").get(getAllCourses);
router.route("/:courseId").get(getCourseById);

// Protected routes
router.use(verifyJWT);

// Student routes
router.route("/:courseId/review").post(addReview);
router.route("/:courseId/progress").get(getCourseProgress);
router.route("/:courseId/modules/:moduleId/lectures/:lectureId/complete")
  .post(markLectureComplete);

// Instructor routes
router.use(isInstructor);

router.route("/")
  .post(
    upload.single("thumbnail"),
    createCourse
  );

router.route("/instructor-courses")
  .get(getInstructorCourses);

router.route("/:courseId")
  .patch(
    upload.single("thumbnail"),
    updateCourse
  );

router.route("/:courseId/publish")
  .patch(publishCourse);

router.route("/:courseId/modules")
  .post(addModule);

router.route("/:courseId/modules/:moduleId/lectures")
  .post(
    upload.single("video"),
    addLecture
  );

router.route("/:courseId/modules/:moduleId/lectures/:lectureId/resources")
  .post(
    upload.single("resource"),
    addLectureResource
  );

router.route("/:courseId/enrolled-students")
  .get(getEnrolledStudents);

export default router;