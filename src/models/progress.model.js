import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
  activityType: {
    type: String,
    enum: [
      "LECTURE_VIEW",
      "QUIZ_ATTEMPT",
      "ASSIGNMENT_SUBMIT",
      "NOTE_CREATE",
      "DISCUSSION_PARTICIPATE",
      "RESOURCE_DOWNLOAD"
    ],
    required: true
  },
  activityDetail: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  timeSpent: {
    type: Number, // in minutes
    default: 0
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const moduleProgressSchema = new mongoose.Schema({
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  completedLectures: [{
    lectureId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    completedAt: {
      type: Date,
      default: Date.now
    },
    timeSpent: {
      type: Number, // in minutes
      default: 0
    },
    lastWatchPosition: {
      type: Number, // in seconds
      default: 0
    }
  }],
  quizzes: [{
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true
    },
    attempts: [{
      attemptId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      score: {
        type: Number,
        required: true
      },
      maxScore: {
        type: Number,
        required: true
      },
      completedAt: {
        type: Date,
        default: Date.now
      }
    }],
    bestScore: {
      type: Number,
      default: 0
    }
  }],
  completionStatus: {
    type: String,
    enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
    default: "NOT_STARTED"
  },
  completionPercentage: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

const progressSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  moduleProgress: [moduleProgressSchema],
  overallProgress: {
    completedModules: {
      type: Number,
      default: 0
    },
    totalModules: {
      type: Number,
      required: true
    },
    completedLectures: {
      type: Number,
      default: 0
    },
    totalLectures: {
      type: Number,
      required: true
    },
    completedQuizzes: {
      type: Number,
      default: 0
    },
    totalQuizzes: {
      type: Number,
      required: true
    },
    averageQuizScore: {
      type: Number,
      default: 0
    },
    completionPercentage: {
      type: Number,
      default: 0
    }
  },
  timeSpent: {
    total: {
      type: Number, // in minutes
      default: 0
    },
    byModule: {
      type: Map,
      of: Number,
      default: new Map()
    }
  },
  studyStreak: {
    currentStreak: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    },
    lastStudyDate: {
      type: Date,
      default: Date.now
    }
  },
  activityLog: [activityLogSchema],
  certificates: [{
    type: {
      type: String,
      enum: ["COMPLETION", "ACHIEVEMENT", "EXCELLENCE"],
      required: true
    },
    issuedAt: {
      type: Date,
      default: Date.now
    },
    certificateUrl: {
      type: String,
      required: true
    }
  }],
  status: {
    type: String,
    enum: ["ACTIVE", "COMPLETED", "PAUSED", "DROPPED"],
    default: "ACTIVE"
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true } 
});

// Indexes for faster queries
progressSchema.index({ student: 1, course: 1 }, { unique: true });
progressSchema.index({ "moduleProgress.completionStatus": 1 });
progressSchema.index({ status: 1 });

// Virtual for time spent today
progressSchema.virtual('timeSpentToday').get(function() {
  const today = new Date();
  return this.activityLog
    .filter(log => {
      const logDate = new Date(log.completedAt);
      return logDate.toDateString() === today.toDateString();
    })
    .reduce((total, log) => total + (log.timeSpent || 0), 0);
});

// Methods
progressSchema.methods.updateProgress = async function() {
  // Update completion percentages and counts
  const moduleStats = this.moduleProgress.reduce((stats, module) => {
    if (module.completionStatus === "COMPLETED") {
      stats.completedModules++;
    }
    stats.completedLectures += module.completedLectures.length;
    return stats;
  }, { completedModules: 0, completedLectures: 0 });

  // Update overall progress
  this.overallProgress.completedModules = moduleStats.completedModules;
  this.overallProgress.completedLectures = moduleStats.completedLectures;
  
  // Calculate completion percentage
  this.overallProgress.completionPercentage = (
    (moduleStats.completedLectures / this.overallProgress.totalLectures) * 100
  ).toFixed(2);

  // Update quiz statistics
  const quizStats = this.moduleProgress.reduce((stats, module) => {
    module.quizzes.forEach(quiz => {
      if (quiz.attempts.length > 0) {
        stats.completedQuizzes++;
        stats.totalScore += quiz.bestScore;
      }
    });
    return stats;
  }, { completedQuizzes: 0, totalScore: 0 });

  this.overallProgress.completedQuizzes = quizStats.completedQuizzes;
  this.overallProgress.averageQuizScore = quizStats.completedQuizzes ?
    (quizStats.totalScore / quizStats.completedQuizzes).toFixed(2) : 0;

  // Update study streak
  const today = new Date().toDateString();
  const lastStudy = new Date(this.studyStreak.lastStudyDate).toDateString();
  
  if (today !== lastStudy) {
    const daysSinceLastStudy = Math.floor(
      (new Date() - new Date(this.studyStreak.lastStudyDate)) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastStudy === 1) {
      this.studyStreak.currentStreak++;
      this.studyStreak.longestStreak = Math.max(
        this.studyStreak.currentStreak,
        this.studyStreak.longestStreak
      );
    } else if (daysSinceLastStudy > 1) {
      this.studyStreak.currentStreak = 1;
    }
    
    this.studyStreak.lastStudyDate = new Date();
  }

  // Check if course is completed
  if (this.overallProgress.completionPercentage >= 100) {
    this.status = "COMPLETED";
  }

  await this.save();
};

// Statics
progressSchema.statics.getStudentOverview = async function(studentId) {
  return await this.aggregate([
    { $match: { student: new mongoose.Types.ObjectId(studentId) } },
    { 
      $group: {
        _id: "$student",
        totalCourses: { $sum: 1 },
        completedCourses: {
          $sum: {
            $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0]
          }
        },
        totalTimeSpent: { $sum: "$timeSpent.total" },
        averageProgress: { $avg: "$overallProgress.completionPercentage" }
      }
    }
  ]);
};

export const Progress = mongoose.model("Progress", progressSchema);  