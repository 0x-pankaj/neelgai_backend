import mongoose from "mongoose";

const votesSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  voteType: {
    type: String,
    enum: ["UPVOTE", "DOWNVOTE"],
    required: true
  }
}, { timestamps: true });

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  votes: [votesSchema],
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment"
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  attachments: [{
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
    }
  }],
  isResolved: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for nested comments
commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment'
});

// Virtual for vote count
commentSchema.virtual('voteCount').get(function() {
  return this.votes.reduce((total, vote) => {
    return total + (vote.voteType === "UPVOTE" ? 1 : -1);
  }, 0);
});

const discussionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: 'text'
  },
  content: {
    type: String,
    required: true,
    trim: true,
    index: 'text'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },
  module: {
    type: mongoose.Schema.Types.ObjectId
  },
  lecture: {
    type: mongoose.Schema.Types.ObjectId
  },
  category: {
    type: String,
    enum: [
      "GENERAL",
      "QUESTION",
      "DISCUSSION",
      "ANNOUNCEMENT",
      "RESOURCE_SHARING",
      "HELP_NEEDED"
    ],
    default: "GENERAL"
  },
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
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
    }
  }],
  votes: [votesSchema],
  viewCount: {
    type: Number,
    default: 0
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isAnnouncement: {
    type: Boolean,
    default: false
  },
  isResolved: {
    type: Boolean,
    default: false
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  resolvedAt: Date,
  lastActivity: {
    type: Date,
    default: Date.now
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  status: {
    type: String,
    enum: ["OPEN", "CLOSED", "ARCHIVED"],
    default: "OPEN"
  },
  comments: [commentSchema]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
discussionSchema.index({ course: 1, module: 1 });
discussionSchema.index({ "comments.author": 1 });
discussionSchema.index({ 
  title: 'text', 
  content: 'text',
  tags: 'text'
});

// Virtual for vote count
discussionSchema.virtual('voteCount').get(function() {
  return this.votes.reduce((total, vote) => {
    return total + (vote.voteType === "UPVOTE" ? 1 : -1);
  }, 0);
});

// Virtual for comment count
discussionSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Virtual for engagement score (weighted combination of views, votes, and comments)
discussionSchema.virtual('engagementScore').get(function() {
  const viewWeight = 1;
  const voteWeight = 2;
  const commentWeight = 3;
  
  return (
    this.viewCount * viewWeight +
    Math.abs(this.voteCount) * voteWeight +
    this.commentCount * commentWeight
  );
});

// Pre-save middleware
discussionSchema.pre('save', function(next) {
  if (this.isModified('comments')) {
    this.lastActivity = new Date();
  }
  next();
});

// Methods
discussionSchema.methods.vote = async function(userId, voteType) {
  const existingVote = this.votes.find(
    vote => vote.user.toString() === userId.toString()
  );

  if (existingVote) {
    if (existingVote.voteType === voteType) {
      // Remove vote if same type
      this.votes = this.votes.filter(
        vote => vote.user.toString() !== userId.toString()
      );
    } else {
      // Update vote type if different
      existingVote.voteType = voteType;
    }
  } else {
    // Add new vote
    this.votes.push({ user: userId, voteType });
  }

  await this.save();
  return this;
};

discussionSchema.methods.addComment = async function(comment) {
  this.comments.push(comment);
  
  // Update participants if not already included
  if (!this.participants.includes(comment.author)) {
    this.participants.push(comment.author);
  }
  
  this.lastActivity = new Date();
  await this.save();
  return this;
};

discussionSchema.methods.toggleFollow = async function(userId) {
  const userIndex = this.followers.indexOf(userId);
  
  if (userIndex === -1) {
    this.followers.push(userId);
  } else {
    this.followers.splice(userIndex, 1);
  }
  
  await this.save();
  return this;
};

// Statics
discussionSchema.statics.getMostEngaged = async function(courseId, limit = 5) {
  const discussions = await this.find({ course: courseId })
    .select('title viewCount votes comments lastActivity')
    .sort('-lastActivity')
    .limit(limit);

  return discussions.sort((a, b) => b.engagementScore - a.engagementScore);
};

export const Comment = mongoose.model('Comment', commentSchema);
export const Discussion = mongoose.model('Discussion', discussionSchema);