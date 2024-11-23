import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      "COURSE_UPDATE",
      "QUIZ_REMINDER",
      "ASSIGNMENT_DUE",
      "DISCUSSION_REPLY",
      "DISCUSSION_MENTION",
      "NOTE_SHARED",
      "GRADE_POSTED",
      "ANNOUNCEMENT",
      "COURSE_COMPLETION",
      "STUDY_REMINDER",
      "ACHIEVEMENT_UNLOCKED",
      "SYSTEM_UPDATE"
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
    default: "MEDIUM"
  },
  status: {
    type: String,
    enum: ["UNREAD", "READ", "ARCHIVED"],
    default: "UNREAD"
  },
  actionUrl: {
    type: String
  },
  metadata: {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course"
    },
    module: {
      type: mongoose.Schema.Types.ObjectId
    },
    discussion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Discussion"
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz"
    },
    note: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note"
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    additionalData: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  deliveryChannels: [{
    type: String,
    enum: ["IN_APP", "EMAIL", "PUSH"],
    default: "IN_APP"
  }],
  deliveryStatus: {
    email: {
      sent: Boolean,
      sentAt: Date,
      error: String
    },
    push: {
      sent: Boolean,
      sentAt: Date,
      error: String
    }
  },
  expiresAt: {
    type: Date
  },
  scheduledFor: {
    type: Date
  }
}, { 
  timestamps: true 
});

// Indexes
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ scheduledFor: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Notification preferences schema for users
const notificationPreferenceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  channels: {
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      frequency: {
        type: String,
        enum: ["IMMEDIATE", "DAILY_DIGEST", "WEEKLY_DIGEST"],
        default: "IMMEDIATE"
      }
    },
    push: {
      enabled: {
        type: Boolean,
        default: true
      },
      quietHours: {
        start: {
          type: String,
          default: "22:00"
        },
        end: {
          type: String,
          default: "08:00"
        }
      }
    }
  },
  preferences: {
    COURSE_UPDATE: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ["IN_APP", "EMAIL", "PUSH"]
      }]
    },
    QUIZ_REMINDER: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ["IN_APP", "EMAIL", "PUSH"]
      }]
    },
    ASSIGNMENT_DUE: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ["IN_APP", "EMAIL", "PUSH"]
      }]
    },
    DISCUSSION_REPLY: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ["IN_APP", "EMAIL", "PUSH"]
      }]
    },
    DISCUSSION_MENTION: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ["IN_APP", "EMAIL", "PUSH"]
      }]
    },
    NOTE_SHARED: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ["IN_APP", "EMAIL", "PUSH"]
      }]
    },
    GRADE_POSTED: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ["IN_APP", "EMAIL", "PUSH"]
      }]
    },
    ANNOUNCEMENT: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ["IN_APP", "EMAIL", "PUSH"]
      }]
    },
    COURSE_COMPLETION: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ["IN_APP", "EMAIL", "PUSH"]
      }]
    },
    STUDY_REMINDER: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ["IN_APP", "EMAIL", "PUSH"]
      }]
    },
    ACHIEVEMENT_UNLOCKED: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ["IN_APP", "EMAIL", "PUSH"]
      }]
    },
    SYSTEM_UPDATE: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ["IN_APP", "EMAIL", "PUSH"]
      }]
    }
  }
}, { 
  timestamps: true 
});

// Methods for notification preferences
notificationPreferenceSchema.methods.isChannelEnabled = function(type, channel) {
  const preference = this.preferences[type];
  return (
    preference?.enabled &&
    preference?.channels?.includes(channel) &&
    this.channels[channel.toLowerCase()]?.enabled
  );
};

notificationPreferenceSchema.methods.shouldSendNow = function(channel) {
  if (channel !== "PUSH") return true;

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${
    now.getMinutes().toString().padStart(2, '0')}`;
  
  const quietHours = this.channels.push.quietHours;
  const start = quietHours.start;
  const end = quietHours.end;

  if (start <= end) {
    return !(currentTime >= start && currentTime <= end);
  } else {
    return !(currentTime >= start || currentTime <= end);
  }
};

export const Notification = mongoose.model("Notification", notificationSchema);
export const NotificationPreference = mongoose.model(
  "NotificationPreference", 
  notificationPreferenceSchema
);