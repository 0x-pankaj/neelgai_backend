import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { notificationService } from "../services/notification.service.js";
import { NotificationPreference } from "../models/notification.model.js";

const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit, status, type, startDate, endDate } = req.query;

  const result = await notificationService.getUserNotifications(
    req.user._id,
    {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      type,
      startDate,
      endDate
    }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result,
        "Notifications fetched successfully"
      )
    );
});

const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await notificationService.getUnreadCount(req.user._id);
  
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { count },
          "Unread notification count fetched successfully"
        )
      );
  });
  
  const markAsRead = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
  
    const notification = await notificationService.markAsRead(
      notificationId,
      req.user._id
    );
  
    if (!notification) {
      throw new ApiError(404, "Notification not found");
    }
  
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          notification,
          "Notification marked as read"
        )
      );
  });
  
  const markAllAsRead = asyncHandler(async (req, res) => {
    await notificationService.markAllAsRead(req.user._id);
  
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          "All notifications marked as read"
        )
      );
  });
  
  const getPreferences = asyncHandler(async (req, res) => {
    let preferences = await NotificationPreference.findOne({
      user: req.user._id
    });
  
    if (!preferences) {
      preferences = await NotificationPreference.create({
        user: req.user._id
      });
    }
  
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          preferences,
          "Notification preferences fetched successfully"
        )
      );
  });
  
  const updatePreferences = asyncHandler(async (req, res) => {
    const { channels, preferences: notificationPreferences } = req.body;
  
    let userPreferences = await NotificationPreference.findOne({
      user: req.user._id
    });
  
    if (!userPreferences) {
      userPreferences = new NotificationPreference({
        user: req.user._id
      });
    }
  
    // Update channels settings
    if (channels) {
      if (channels.email) {
        userPreferences.channels.email = {
          ...userPreferences.channels.email,
          ...channels.email
        };
      }
  
      if (channels.push) {
        userPreferences.channels.push = {
          ...userPreferences.channels.push,
          ...channels.push
        };
      }
    }
  
    // Update notification type preferences
    if (notificationPreferences) {
      Object.keys(notificationPreferences).forEach(type => {
        if (userPreferences.preferences[type]) {
          userPreferences.preferences[type] = {
            ...userPreferences.preferences[type],
            ...notificationPreferences[type]
          };
        }
      });
    }
  
    await userPreferences.save();
  
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          userPreferences,
          "Notification preferences updated successfully"
        )
      );
  });
  
  // Admin/Instructor endpoints
  const sendBulkNotifications = asyncHandler(async (req, res) => {
    const { notifications } = req.body;
  
    if (!["INSTRUCTOR", "ADMIN"].includes(req.user.role)) {
      throw new ApiError(403, "Unauthorized to send bulk notifications");
    }
  
    const createdNotifications = await notificationService.createBulkNotifications(
      notifications
    );
  
    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          createdNotifications,
          "Bulk notifications sent successfully"
        )
      );
  });
  
  const getNotificationStats = asyncHandler(async (req, res) => {
    if (!["ADMIN"].includes(req.user.role)) {
      throw new ApiError(403, "Unauthorized to view notification statistics");
    }
  
    const stats = await Notification.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ["$status", "UNREAD"] }, 1, 0] }
          },
          byType: {
            $push: {
              type: "$type",
              count: 1
            }
          },
          byPriority: {
            $push: {
              priority: "$priority",
              count: 1
            }
          },
          deliverySuccess: {
            email: {
              $sum: { 
                $cond: [{ $eq: ["$deliveryStatus.email.sent", true] }, 1, 0] 
              }
            },
            push: {
              $sum: { 
                $cond: [{ $eq: ["$deliveryStatus.push.sent", true] }, 1, 0] 
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          total: 1,
          unread: 1,
          readRate: {
            $multiply: [
              { $divide: [{ $subtract: ["$total", "$unread"] }, "$total"] },
              100
            ]
          },
          byType: 1,
          byPriority: 1,
          deliverySuccess: 1
        }
      }
    ]);
  
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          stats[0] || {},
          "Notification statistics fetched successfully"
        )
      );
  });
  
  export {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    getPreferences,
    updatePreferences,
    sendBulkNotifications,
    getNotificationStats
  };