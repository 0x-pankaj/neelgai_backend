import { Router } from "express";
import {
  loginUser,
  registerUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  enrollInCourse,
  updatePreferences,
  getEnrolledCourses,
  getUserProfile,
  getStudyProgress
} from "../controllers/user.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

// Public routes
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);

// Protected routes
router.use(verifyJWT); // Apply verifyJWT middleware to all routes below

// User profile and settings
router.route("/logout").post(logoutUser);
router.route("/change-password").post(changeCurrentPassword);
router.route("/current-user").get(getCurrentUser);
router.route("/update-account").patch(updateAccountDetails);
router.route("/avatar").patch(upload.single("avatar"), updateUserAvatar);
router.route("/cover-image").patch(upload.single("coverImage"), updateUserCoverImage);

// EdTech specific routes
router.route("/enroll").post(enrollInCourse);
router.route("/preferences").patch(updatePreferences);
router.route("/enrolled-courses").get(getEnrolledCourses);
router.route("/profile/:username").get(getUserProfile);
router.route("/study-progress").get(getStudyProgress);

export default router;