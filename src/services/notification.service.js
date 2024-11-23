import { Notification, NotificationPreference } from "../models/notification.model.js";
import { sendEmail } from "../utils/emailService.js";
import { sendPushNotification } from "../utils/pushNotificationService.js";

class NotificationService {
  async createNotification({
    recipient,
    type,
    title,
    message,
    priority = "MEDIUM",
    actionUrl,
    metadata = {},
    deliveryChannels = ["IN_APP"],
    scheduledFor
  }) {
    try {
      // Get user's notification preferences
      const preferences = await NotificationPreference.findOne({ user: recipient });
      
      if (!preferences) {
        // Create default preferences if not exists
        await NotificationPreference.create({ user: recipient });
      }

      // Create notification
      const notification = await Notification.create({
        recipient,
        type,
        title,
        message,
        priority,
        actionUrl,
        metadata,
        deliveryChannels: this._getEnabledChannels(preferences, type, deliveryChannels),
        scheduledFor: scheduledFor || new Date()
      });

      // Send notifications through enabled channels
      await this._deliverNotification(notification, preferences);

      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  async createBulkNotifications(notifications) {
    try {
      const createdNotifications = [];

      for (const notification of notifications) {
        const preferences = await NotificationPreference.findOne({
          user: notification.recipient
        });

        const enabledChannels = this._getEnabledChannels(
          preferences,
          notification.type,
          notification.deliveryChannels
        );

        const createdNotification = await Notification.create({
          ...notification,
          deliveryChannels: enabledChannels,
          scheduledFor: notification.scheduledFor || new Date()
        });

        await this._deliverNotification(createdNotification, preferences);
        createdNotifications.push(createdNotification);
      }

      return createdNotifications;
    } catch (error) {
      console.error("Error creating bulk notifications:", error);
      throw error;
    }
  }

  async _deliverNotification(notification, preferences) {
    const deliveryPromises = [];

    if (notification.deliveryChannels.includes("EMAIL")) {
      deliveryPromises.push(this._sendEmailNotification(notification, preferences));
    }

    if (notification.deliveryChannels.includes("PUSH")) {
      deliveryPromises.push(this._sendPushNotification(notification, preferences));
    }

    try {
      await Promise.all(deliveryPromises);
    } catch (error) {
      console.error("Error delivering notification:", error);
      // Continue even if delivery fails
    }
  }

  async _sendEmailNotification(notification, preferences) {
    if (!preferences?.shouldSendNow("EMAIL")) return;

    try {
      await sendEmail({
        to: notification.recipient.email,
        subject: notification.title,
        text: notification.message,
        template: `notification_${notification.type.toLowerCase()}`,
        context: {
          ...notification.metadata,
          actionUrl: notification.actionUrl
        }
      });

      notification.deliveryStatus.email = {
        sent: true,
        sentAt: new Date()
      };
    } catch (error) {
      notification.deliveryStatus.email = {
        sent: false,
        error: error.message
      };
    }

    await notification.save();
  }

  async _sendPushNotification(notification, preferences) {
    if (!preferences?.shouldSendNow("PUSH")) return;

    try {
      await sendPushNotification({
        userId: notification.recipient._id,
        title: notification.title,
        body: notification.message,
        data: {
          type: notification.type,
          actionUrl: notification.actionUrl,
          ...notification.metadata
        }
      });

      notification.deliveryStatus.push = {
        sent: true,
        sentAt: new Date()
      };
    } catch (error) {
      notification.deliveryStatus.push = {
        sent: false,
        error: error.message
      };
    }

    await notification.save();
  }

  _getEnabledChannels(preferences, type, requestedChannels) {
    if (!preferences) return ["IN_APP"];

    return requestedChannels.filter(channel =>
      preferences.isChannelEnabled(type, channel)
    );
  }

  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) return null;

    notification.status = "READ";
    await notification.save();
    return notification;
  }

  async markAllAsRead(userId) {
    await Notification.updateMany(
      {
        recipient: userId,
        status: "UNREAD"
      },
      {
        $set: { status: "READ" }
      }
    );
  }

  async getUnreadCount(userId) {
    return await Notification.countDocuments({
      recipient: userId,
      status: "UNREAD"
    });
  }

  async getUserNotifications(userId, {
    page = 1,
    limit = 10,
    status,
    type,
    startDate,
    endDate
  } = {}) {
    const query = { recipient: userId };

    if (status) query.status = status;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("metadata.course", "title")
      .populate("metadata.sender", "fullName avatar");

    const total = await Notification.countDocuments(query);

    return {
      notifications,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page
    };
  }
}

export const notificationService = new NotificationService();