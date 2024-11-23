import { 
    PlatformMetrics, 
    UserAnalytics, 
    CourseAnalytics, 
    InstructorAnalytics 
  } from "../models/analytics.model.js";
  import { Course } from "../models/course.model.js";
  import { User } from "../models/user.model.js";
  import { Progress } from "../models/progress.model.js";
  import { Discussion } from "../models/discussion.model.js";
  import { Quiz } from "../models/quiz.model.js";
  
  class AnalyticsService {
    // Platform Analytics
    async getPlatformMetrics(startDate, endDate) {
      try {
        const metrics = await PlatformMetrics.find({
          date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }).sort({ date: 1 });
  
        return this._aggregatePlatformMetrics(metrics);
      } catch (error) {
        console.error("Error fetching platform metrics:", error);
        throw error;
      }
    }
  
    async updatePlatformMetrics() {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
  
        // Calculate metrics
        const [
          activeUsers,
          courseMetrics,
          quizMetrics,
          discussionMetrics
        ] = await Promise.all([
          this._calculateActiveUsers(),
          this._calculateCourseMetrics(),
          this._calculateQuizMetrics(),
          this._calculateDiscussionMetrics()
        ]);
  
        // Create or update metrics
        await PlatformMetrics.findOneAndUpdate(
          { date: today },
          {
            activeUsers,
            courseMetrics,
            quizMetrics,
            discussionMetrics
          },
          { upsert: true, new: true }
        );
      } catch (error) {
        console.error("Error updating platform metrics:", error);
        throw error;
      }
    }
  
    // User Analytics
    async getUserAnalytics(userId, startDate, endDate) {
      try {
        const analytics = await UserAnalytics.find({
          user: userId,
          date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        })
        .populate('learningMetrics.coursesAccessed', 'title')
        .populate('progressMetrics.courseProgress.course', 'title')
        .sort({ date: 1 });
  
        return this._aggregateUserAnalytics(analytics);
      } catch (error) {
        console.error("Error fetching user analytics:", error);
        throw error;
      }
    }
  
    async updateUserAnalytics(userId) {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
  
        const [
          learningMetrics,
          progressMetrics,
          engagementMetrics
        ] = await Promise.all([
          this._calculateUserLearningMetrics(userId),
          this._calculateUserProgressMetrics(userId),
          this._calculateUserEngagementMetrics(userId)
        ]);
  
        await UserAnalytics.findOneAndUpdate(
          { user: userId, date: today },
          {
            learningMetrics,
            progressMetrics,
            engagementMetrics
          },
          { upsert: true, new: true }
        );
      } catch (error) {
        console.error("Error updating user analytics:", error);
        throw error;
      }
    }
  
    // Course Analytics
    async getCourseAnalytics(courseId, startDate, endDate) {
      try {
        const analytics = await CourseAnalytics.find({
          course: courseId,
          date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }).sort({ date: 1 });
  
        return this._aggregateCourseAnalytics(analytics);
      } catch (error) {
        console.error("Error fetching course analytics:", error);
        throw error;
      }
    }
  
    async updateCourseAnalytics(courseId) {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
  
        const [
          enrollmentMetrics,
          engagementMetrics,
          performanceMetrics,
          contentMetrics,
          interactionMetrics,
          studentFeedback
        ] = await Promise.all([
          this._calculateCourseEnrollmentMetrics(courseId),
          this._calculateCourseEngagementMetrics(courseId),
          this._calculateCoursePerformanceMetrics(courseId),
          this._calculateCourseContentMetrics(courseId),
          this._calculateCourseInteractionMetrics(courseId),
          this._calculateCourseStudentFeedback(courseId)
        ]);
  
        await CourseAnalytics.findOneAndUpdate(
          { course: courseId, date: today },
          {
            enrollmentMetrics,
            engagementMetrics,
            performanceMetrics,
            contentMetrics,
            interactionMetrics,
            studentFeedback
          },
          { upsert: true, new: true }
        );
      } catch (error) {
        console.error("Error updating course analytics:", error);
        throw error;
      }
    }
  
    // Instructor Analytics
    async getInstructorAnalytics(instructorId, startDate, endDate) {
      try {
        const analytics = await InstructorAnalytics.find({
          instructor: instructorId,
          date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }).sort({ date: 1 });
  
        return this._aggregateInstructorAnalytics(analytics);
      } catch (error) {
        console.error("Error fetching instructor analytics:", error);
        throw error;
      }
    }
  
    async updateInstructorAnalytics(instructorId) {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
  
        const [
          courseMetrics,
          engagementMetrics,
          studentPerformance,
          revenueMetrics
        ] = await Promise.all([
          this._calculateInstructorCourseMetrics(instructorId),
          this._calculateInstructorEngagementMetrics(instructorId),
          this._calculateInstructorStudentPerformance(instructorId),
          this._calculateInstructorRevenueMetrics(instructorId)
        ]);
  
        await InstructorAnalytics.findOneAndUpdate(
          { instructor: instructorId, date: today },
          {
            courseMetrics,
            engagementMetrics,
            studentPerformance,
            revenueMetrics
          },
          { upsert: true, new: true }
        );
      } catch (error) {
        console.error("Error updating instructor analytics:", error);
        throw error;
      }
    }
  
    // Private helper methods
async _calculateActiveUsers() {
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [daily, weekly, monthly] = await Promise.all([
      User.countDocuments({ lastActive: { $gte: oneDayAgo } }),
      User.countDocuments({ lastActive: { $gte: oneWeekAgo } }),
      User.countDocuments({ lastActive: { $gte: oneMonthAgo } })
    ]);

    return { daily, weekly, monthly };
  }

  async _calculateCourseMetrics() {
    const [totalEnrollments, activeEnrollments] = await Promise.all([
      Progress.countDocuments(),
      Progress.countDocuments({ status: 'ACTIVE' })
    ]);

    const completionStats = await Progress.aggregate([
      {
        $group: {
          _id: null,
          totalCompleted: {
            $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] }
          },
          averageProgress: { $avg: "$overallProgress.completionPercentage" }
        }
      }
    ]);

    return {
      totalEnrollments,
      activeEnrollments,
      completionRate: completionStats[0]?.totalCompleted / totalEnrollments * 100 || 0,
      averageProgress: completionStats[0]?.averageProgress || 0
    };
  }

  async _calculateQuizMetrics() {
    const quizStats = await Quiz.aggregate([
      {
        $unwind: "$attempts"
      },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          averageScore: { $avg: "$attempts.percentage" },
          passedAttempts: {
            $sum: {
              $cond: [
                { $gte: ["$attempts.percentage", "$passingPercentage"] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const stats = quizStats[0] || {
      totalAttempts: 0,
      averageScore: 0,
      passedAttempts: 0
    };

    return {
      totalAttempts: stats.totalAttempts,
      averageScore: stats.averageScore,
      passRate: (stats.passedAttempts / stats.totalAttempts) * 100 || 0
    };
  }

  async _calculateDiscussionMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const discussionStats = await Discussion.aggregate([
      {
        $facet: {
          newDiscussions: [
            {
              $match: {
                createdAt: { $gte: today }
              }
            },
            {
              $count: "count"
            }
          ],
          commentStats: [
            {
              $group: {
                _id: null,
                totalComments: { $sum: { $size: "$comments" } },
                uniqueParticipants: { $addToSet: "$participants" }
              }
            }
          ]
        }
      }
    ]);

    const stats = discussionStats[0];
    return {
      newDiscussions: stats.newDiscussions[0]?.count || 0,
      totalComments: stats.commentStats[0]?.totalComments || 0,
      activeParticipants: stats.commentStats[0]?.uniqueParticipants.length || 0
    };
  }

  async _calculateUserLearningMetrics(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const progress = await Progress.findOne({
      student: userId,
      lastAccessedAt: { $gte: today }
    });

    const quizAttempts = await Quiz.aggregate([
      {
        $unwind: "$attempts"
      },
      {
        $match: {
          "attempts.student": new mongoose.Types.ObjectId(userId),
          "attempts.submittedAt": { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          averageScore: { $avg: "$attempts.percentage" }
        }
      }
    ]);

    const discussions = await Discussion.countDocuments({
      participants: userId,
      lastActivity: { $gte: today }
    });

    return {
      timeSpent: progress?.timeSpent.total || 0,
      coursesAccessed: progress?.course ? [progress.course] : [],
      lecturesWatched: progress?.completedLectures?.length || 0,
      quizzesTaken: quizAttempts[0]?.count || 0,
      averageQuizScore: quizAttempts[0]?.averageScore || 0,
      discussionParticipation: discussions
    };
  }

  async _calculateUserProgressMetrics(userId) {
    const progress = await Progress.find({ student: userId })
      .populate('course', 'title')
      .select('status overallProgress');

    return {
      courseProgress: progress.map(p => ({
        course: p.course._id,
        progress: p.overallProgress.completionPercentage,
        lastAccessed: p.lastAccessedAt
      })),
      totalCoursesCompleted: progress.filter(p => p.status === 'COMPLETED').length,
      certificatesEarned: progress.filter(p => p.certificates.length > 0).length
    };
  }

  async _calculateUserEngagementMetrics(userId) {
    const user = await User.findById(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get user sessions for today
    const sessions = []; // This would come from your session tracking system

    return {
      sessionCount: sessions.length,
      averageSessionDuration: sessions.length ? 
        sessions.reduce((acc, s) => acc + s.duration, 0) / sessions.length : 0,
      lastActive: user.lastActive,
      deviceUsage: user.deviceUsage || {
        desktop: 0,
        mobile: 0,
        tablet: 0
      }
    };
  }

  // Aggregation methods
  _aggregatePlatformMetrics(metrics) {
    return {
      timeline: metrics.map(m => ({
        date: m.date,
        activeUsers: m.activeUsers,
        enrollments: m.courseMetrics.totalEnrollments,
        quizAttempts: m.quizMetrics.totalAttempts,
        discussions: m.discussionMetrics.newDiscussions
      })),
      totals: metrics.reduce((acc, m) => ({
        activeUsers: acc.activeUsers + m.activeUsers.daily,
        enrollments: acc.enrollments + m.courseMetrics.totalEnrollments,
        quizAttempts: acc.quizAttempts + m.quizMetrics.totalAttempts,
        discussions: acc.discussions + m.discussionMetrics.newDiscussions
      }), { activeUsers: 0, enrollments: 0, quizAttempts: 0, discussions: 0 }),
      averages: {
        completionRate: this._calculateAverage(metrics, 'm => m.courseMetrics.completionRate'),
        quizScore: this._calculateAverage(metrics, 'm => m.quizMetrics.averageScore'),
        studentEngagement: this._calculateAverage(metrics, 'm => m.discussionMetrics.activeParticipants')
      }
    };
  }

  _calculateAverage(array, valueGetter) {
    const values = array.map(valueGetter).filter(v => !isNaN(v));
    return values.length ? values.reduce((a, b) => a + b) / values.length : 0;
  }
}

export const analyticsService = new AnalyticsService();