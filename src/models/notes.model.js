import mongoose from "mongoose";

const noteTagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    default: "#808080"
  }
}, { _id: false });

const attachmentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["IMAGE", "PDF", "DOCUMENT", "LINK"],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  size: {
    type: Number, // in bytes
    required: true
  },
  mimeType: String
}, { timestamps: true });

const reminderSchema = new mongoose.Schema({
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ["PENDING", "COMPLETED", "MISSED"],
    default: "PENDING"
  },
  notificationSent: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: 'text'
  },
  content: {
    type: String,
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course"
  },
  module: {
    type: mongoose.Schema.Types.ObjectId
  },
  lecture: {
    type: mongoose.Schema.Types.ObjectId
  },
  tags: [noteTagSchema],
  attachments: [attachmentSchema],
  reminder: reminderSchema,
  isPinned: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: "#FFFFFF"
  },
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    permission: {
      type: String,
      enum: ["READ", "EDIT"],
      default: "READ"
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  version: {
    type: Number,
    default: 1
  },
  lastEditedAt: {
    type: Date
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
noteSchema.index({ student: 1, course: 1 });
noteSchema.index({ "sharedWith.user": 1 });
noteSchema.index({ 
  title: 'text', 
  content: 'text',
  'tags.name': 'text'
});

// Virtual for word count
noteSchema.virtual('wordCount').get(function() {
  return this.content.split(/\s+/).length;
});

// Virtual for character count
noteSchema.virtual('characterCount').get(function() {
  return this.content.length;
});

// Pre-save middleware
noteSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.lastEditedAt = new Date();
    this.version += 1;
  }
  next();
});

// Methods
noteSchema.methods.share = async function(userId, permission = "READ") {
  // Check if already shared
  const existingShare = this.sharedWith.find(
    share => share.user.toString() === userId.toString()
  );

  if (existingShare) {
    existingShare.permission = permission;
    existingShare.sharedAt = new Date();
  } else {
    this.sharedWith.push({
      user: userId,
      permission,
      sharedAt: new Date()
    });
  }

  await this.save();
  return this;
};

noteSchema.methods.unshare = async function(userId) {
  this.sharedWith = this.sharedWith.filter(
    share => share.user.toString() !== userId.toString()
  );
  await this.save();
  return this;
};

// Statics
noteSchema.statics.getNotesOverview = async function(studentId) {
  return await this.aggregate([
    { 
      $match: { 
        student: new mongoose.Types.ObjectId(studentId),
        isArchived: false
      }
    },
    {
      $group: {
        _id: null,
        totalNotes: { $sum: 1 },
        totalPinned: { 
          $sum: { $cond: [{ $eq: ["$isPinned", true] }, 1, 0] }
        },
        totalFavorites: {
          $sum: { $cond: [{ $eq: ["$isFavorite", true] }, 1, 0] }
        },
        totalShared: {
          $sum: { $cond: [{ $gt: [{ $size: "$sharedWith" }, 0] }, 1, 0] }
        },
        courseDistribution: {
          $push: {
            course: "$course",
            count: 1
          }
        }
      }
    }
  ]);
};

export const Note = mongoose.model("Note", noteSchema);