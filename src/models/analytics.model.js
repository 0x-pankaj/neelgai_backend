import mongoose from "mongoose";

const platformMetricsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  activeUsers: {
    daily: { type: Number, default: 0 },
    weekly: { type: Number, default: 0 },
    monthly: { type: Number, default: 0 }
  },
  userEngagement: {
    averageSessionDuration: { type: Number, default: 0 }, // in minutes
    totalSessionTime: { type: Number, default: 0 }, // in minutes
    bounceRate: { type: Number, default: 0 },
    pageViews: { type: Number, default: 0 }
  },
  courseMetrics: {
    totalEnrollments: { type: Number, default: 0 },
    activeEnrollments: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    averageProgress: { type: Number, default: 0 }
  },
  quizMetrics: {
    totalAttempts: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    passRate: { type: Number, default: 0 }
  },
  discussionMetrics: {
    newDiscussions: { type: Number, default: 0 },
    totalComments: { type: Number, default: 0 },
    activeParticipants: { type: Number, default: 0 }
  },
  deviceStats: {
    desktop: { type: Number, default: 0 },
    mobile: { type: Number, default: 0 },
    tablet: { type: Number, default: 0 }
  },
  errorLogs: [{
    errorType: String,
    count: Number,
    lastOccurred: Date
  }]
}, { timestamps: true });

const userAnalyticsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  learningMetrics: {
    timeSpent: { type: Number, default: 0 }, // in minutes
    coursesAccessed: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    lecturesWatched: { type: Number, default: 0 },
    quizzesTaken: { type: Number, default: 0 },
    averageQuizScore: { type: Number, default: 0 },
    discussionParticipation: { type: Number, default: 0 }
  },
  progressMetrics: {
    courseProgress: [{
      course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
      progress: Number,
      lastAccessed: Date
    }],
    totalCoursesCompleted: { type: Number, default: 0 },
    certificatesEarned: { type: Number, default: 0 }
  },
  engagementMetrics: {
    sessionCount: { type: Number, default: 0 },
    averageSessionDuration: { type: Number, default: 0 },
    lastActive: Date,
    deviceUsage: {
      desktop: { type: Number, default: 0 },
      mobile: { type: Number, default: 0 },
      tablet: { type: Number, default: 0 }
    }
  }
}, { timestamps: true });

const courseAnalyticsSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  enrollmentMetrics: {
    totalEnrollments: { type: Number, default: 0 },
    activeStudents: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    averageProgress: { type: Number, default: 0 }
  },
  engagementMetrics: {
    totalTimeSpent: { type: Number, default: 0 }, // in minutes
    averageTimePerStudent: { type: Number, default: 0 }, // in minutes
    lectureViews: { type: Number, default: 0 },
    averageViewsPerLecture: { type: Number, default: 0 }
  },
  performanceMetrics: {
    quizAttempts: { type: Number, default: 0 },
    averageQuizScore: { type: Number, default: 0 },
    assignmentSubmissions: { type: Number, default: 0 },
    averageAssignmentScore: { type: Number, default: 0 }
  },
  contentMetrics: {
    mostViewedLectures: [{
      lecture: { type: mongoose.Schema.Types.ObjectId },
      views: Number
    }],
    leastViewedLectures: [{
      lecture: { type: mongoose.Schema.Types.ObjectId },
      views: Number
    }]
  },
  interactionMetrics: {
    discussionPosts: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    questionAsked: { type: Number, default: 0 },
    questionsAnswered: { type: Number, default: 0 }
  },
  studentFeedback: {
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    ratingDistribution: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 }
    }
  }
}, { timestamps: true });

const instructorAnalyticsSchema = new mongoose.Schema({
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  courseMetrics: {
    totalCourses: { type: Number, default: 0 },
    activeCourses: { type: Number, default: 0 },
    totalStudents: { type: Number, default: 0 },
    averageCourseRating: { type: Number, default: 0 }
  },
  engagementMetrics: {
    totalLectures: { type: Number, default: 0 },
    totalContent: { type: Number, default: 0 }, // in minutes
    discussionResponses: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 } // in hours
  },
  studentPerformance: {
    averageCompletionRate: { type: Number, default: 0 },
    averageQuizScore: { type: Number, default: 0 },
    studentSatisfaction: { type: Number, default: 0 }
  },
  revenueMetrics: {
    totalRevenue: { type: Number, default: 0 },
    monthlyCourseRevenue: [{
      month: Date,
      amount: Number
    }]
  }
}, { timestamps: true });

export const PlatformMetrics = mongoose.model("PlatformMetrics", platformMetricsSchema);
export const UserAnalytics = mongoose.model("UserAnalytics", userAnalyticsSchema);
export const CourseAnalytics = mongoose.model("CourseAnalytics", courseAnalyticsSchema);
export const InstructorAnalytics = mongoose.model("InstructorAnalytics", instructorAnalyticsSchema);