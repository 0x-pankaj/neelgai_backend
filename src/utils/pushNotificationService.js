import { Client, Databases, Account, Functions } from 'node-appwrite';
import { User } from "../models/user.model.js";

class PushNotificationService {
  constructor() {
    // Initialize Appwrite Client
    this.client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    this.database = new Databases(this.client);
    this.account = new Account(this.client);
    this.functions = new Functions(this.client);

    // Collection IDs for Appwrite
    this.DEVICE_TOKENS_COLLECTION = process.env.APPWRITE_DEVICE_TOKENS_COLLECTION_ID;
    this.NOTIFICATIONS_COLLECTION = process.env.APPWRITE_NOTIFICATIONS_COLLECTION_ID;
  }

  async sendPushNotification({
    userId,
    title,
    body,
    data = {},
    imageUrl,
    badge,
    sound = "default"
  }) {
    try {
      // Get user's device tokens from Appwrite
      const tokens = await this.database.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        this.DEVICE_TOKENS_COLLECTION,
        [
          // Querying tokens based on userId
          ["userId", "==", userId],
          ["isActive", "==", true]
        ]
      );

      if (!tokens?.total) {
        throw new Error("No active device tokens found for user");
      }

      // Store notification in Appwrite database
      const notification = await this.database.createDocument(
        process.env.APPWRITE_DATABASE_ID,
        this.NOTIFICATIONS_COLLECTION,
        'unique()',
        {
          userId,
          title,
          body,
          data: JSON.stringify(data),
          imageUrl,
          badge,
          sound,
          status: 'PENDING',
          createdAt: new Date().toISOString()
        }
      );

      // Execute notification function for each device token
      const sendPromises = tokens.documents.map(token => 
        this.functions.createExecution(
          process.env.APPWRITE_NOTIFICATION_FUNCTION_ID,
          JSON.stringify({
            notificationId: notification.$id,
            deviceToken: token.token,
            title,
            body,
            data,
            imageUrl,
            badge,
            sound
          })
        )
      );

      const results = await Promise.allSettled(sendPromises);

      // Process results and update notification status
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;

      // Update notification status in database
      await this.database.updateDocument(
        process.env.APPWRITE_DATABASE_ID,
        this.NOTIFICATIONS_COLLECTION,
        notification.$id,
        {
          status: successCount > 0 ? 'SENT' : 'FAILED',
          successCount,
          failureCount,
          updatedAt: new Date().toISOString()
        }
      );

      // Handle failed tokens
      if (failureCount > 0) {
        const failedTokens = tokens.documents.filter((_, index) => 
          results[index].status === 'rejected'
        );

        // Mark failed tokens as inactive
        await Promise.all(failedTokens.map(token =>
          this.database.updateDocument(
            process.env.APPWRITE_DATABASE_ID,
            this.DEVICE_TOKENS_COLLECTION,
            token.$id,
            { isActive: false }
          )
        ));
      }

      return {
        success: successCount > 0,
        total: tokens.total,
        successCount,
        failureCount
      };
    } catch (error) {
      console.error("Error sending push notification:", error);
      throw error;
    }
  }

  async sendBulkPushNotifications(notifications) {
    const results = [];
    for (const notification of notifications) {
      try {
        const result = await this.sendPushNotification(notification);
        results.push({
          success: true,
          userId: notification.userId,
          result
        });
      } catch (error) {
        results.push({
          success: false,
          userId: notification.userId,
          error: error.message
        });
      }
    }
    return results;
  }

  async registerDeviceToken(userId, token, deviceInfo = {}) {
    try {
      // Check if token already exists
      const existingTokens = await this.database.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        this.DEVICE_TOKENS_COLLECTION,
        [
          ["token", "==", token],
          ["isActive", "==", true]
        ]
      );

      if (existingTokens.total > 0) {
        // Update existing token if it belongs to a different user
        const existingToken = existingTokens.documents[0];
        if (existingToken.userId !== userId) {
          await this.database.updateDocument(
            process.env.APPWRITE_DATABASE_ID,
            this.DEVICE_TOKENS_COLLECTION,
            existingToken.$id,
            {
              userId,
              deviceInfo: JSON.stringify(deviceInfo),
              updatedAt: new Date().toISOString()
            }
          );
        }
        return existingToken.$id;
      }

      // Create new token document
      const tokenDoc = await this.database.createDocument(
        process.env.APPWRITE_DATABASE_ID,
        this.DEVICE_TOKENS_COLLECTION,
        'unique()',
        {
          userId,
          token,
          deviceInfo: JSON.stringify(deviceInfo),
          isActive: true,
          createdAt: new Date().toISOString()
        }
      );

      return tokenDoc.$id;
    } catch (error) {
      console.error("Error registering device token:", error);
      throw error;
    }
  }

  async unregisterDeviceToken(token) {
    try {
      const existingTokens = await this.database.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        this.DEVICE_TOKENS_COLLECTION,
        [["token", "==", token]]
      );

      if (existingTokens.total > 0) {
        await this.database.updateDocument(
          process.env.APPWRITE_DATABASE_ID,
          this.DEVICE_TOKENS_COLLECTION,
          existingTokens.documents[0].$id,
          { isActive: false }
        );
      }
    } catch (error) {
      console.error("Error unregistering device token:", error);
      throw error;
    }
  }

  async getUserNotificationHistory(userId, limit = 50) {
    try {
      const notifications = await this.database.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        this.NOTIFICATIONS_COLLECTION,
        [
          ["userId", "==", userId]
        ],
        limit,
        0,
        "createdAt", // Order by
        ["DESC"]     // Descending order
      );

      return notifications.documents;
    } catch (error) {
      console.error("Error fetching notification history:", error);
      throw error;
    }
  }
}

export const pushNotificationService = new PushNotificationService();

export const sendPushNotification = (options) => 
  pushNotificationService.sendPushNotification(options);