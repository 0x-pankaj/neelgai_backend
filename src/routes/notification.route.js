import { Router } from "express";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreferences,
  sendBulkNotifications,
  getNotificationStats
} from "../controllers/notification.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { isAdmin, isInstructor } from "../middleware/role.middleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// User routes
router.route("/")
  .get(getNotifications);

router.route("/unread-count")
  .get(getUnreadCount);

router.route("/mark-read/:notificationId")
  .patch(markAsRead);

router.route("/mark-all-read")
  .patch(markAllAsRead);

// Preferences
router.route("/preferences")
  .get(getPreferences)
  .patch(updatePreferences);

// Admin/Instructor routes
router.route("/bulk-send")
  .post(isInstructor, sendBulkNotifications);

router.route("/stats")
  .get(isAdmin, getNotificationStats);

export default router;