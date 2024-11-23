import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { analyticsService } from "../services/analytics.service.js";
import { Course } from "../models/course.model.js";
import { User } from "../models/user.model.js";
import { Progress } from "../models/progress.model.js";
import { Quiz } from "../models/quiz.model.js";

const getAdminDashboard = asyncHandler(async (req, res) => {
  const today = new Date();
  const thirtyDaysAgo = new Date(today - 30 * 24 * 60 * 60 * 1000);

  // Get platform analytics for last 30 days
  const platformMetrics = await analyticsService.getPlatformMetrics(
    thirtyDaysAgo,
    today
  );

  // Get recent user registrations
  const recentUsers = await User.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .select('fullName email role createdAt');

  // Get top performing courses
  const topCourses = await Course.aggregate([
    {
      $lookup: {
        from: "progresses",
        localField: "_id",
        foreignField: "course",
        as: "enrollments"
      }
    },
    {
      $project: {
        title: 1,
        instructor: 1,
        enrollmentCount: { $size: "$enrollments" },
        averageRating: "$ratings.average",
        completionRate: {
          $multiply: [
            {
              $divide: [
                {
                  $size: {
                    $filter: {
                      input: "$enrollments",
                      as: "enrollment",
                      cond: { $eq: ["$$enrollment.status", "COMPLETED"] }
                    }
                  }
                },
                { $size: "$enrollments" }
              ]
            },
            100
          ]
        }
      }
    },
    { $sort: { enrollmentCount: -1 } },
    { $limit: 5 }
  ]);

  // Get revenue statistics
  const revenueStats = await Course.aggregate([
    {
      $match: {
        "pricing.isFree": false,
        createdAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $lookup: {
        from: "progresses",
        localField: "_id",
        foreignField: "course",
        as: "enrollments"
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
        },
        revenue: {
          $sum: { $multiply: ["$pricing.price", { $size: "$enrollments" }] }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          platformMetrics,
          recentUsers,
          topCourses,
          revenueStats
        },
        "Admin dashboard data fetched successfully"
      )
    );
});

const getInstructorDashboard = asyncHandler(async (req, res) => {
  const instructorId = req.user._id;
  const today = new Date();
  const thirtyDaysAgo = new Date(today - 30 * 24 * 60 * 60 * 1000);

  // Get instructor's analytics
  const instructorAnalytics = await analyticsService.getInstructorAnalytics(
    instructorId,
    thirtyDaysAgo,
    today
  );

  // Get instructor's courses with detailed metrics
  const courseMetrics = await Course.aggregate([
    { $match: { instructor: instructorId } },
    {
      $lookup: {
        from: "progresses",
        localField: "_id",
        foreignField: "course",
        as: "enrollments"
      }
    },
    {
      $project: {
        title: 1,
        enrollmentCount: { $size: "$enrollments" },
        activeStudents: {
          $size: {
            $filter: {
              input: "$enrollments",
              as: "enrollment",
              cond: { $eq: ["$$enrollment.status", "ACTIVE"] }
            }
          }
        },
        completionRate: {
          $multiply: [
            {
              $divide: [
                {
                  $size: {
                    $filter: {
                      input: "$enrollments",
                      as: "enrollment",
                      cond: { $eq: ["$$enrollment.status", "COMPLETED"] }
                    }
                  }
                },
                { $size: "$enrollments" }
              ]
            },
            100
          ]
        },
        averageRating: "$ratings.average",
        revenue: {
          $multiply: ["$pricing.price", { $size: "$enrollments" }]
        }
      }
    }
  ]);

  // Get recent student activity
  const recentActivity = await Progress.find({
    course: { $in: courseMetrics.map(c => c._id) }
  })
    .sort({ lastAccessedAt: -1 })
    .limit(10)
    .populate('student', 'fullName avatar')
    .populate('course', 'title');

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          instructorAnalytics,
          courseMetrics,
          recentActivity
        },
        "Instructor dashboard data fetched successfully"
      )
    );
});

const getStudentDashboard = asyncHandler(async (req, res) => {
  const studentId = req.user._id;
  const today = new Date();
  const thirtyDaysAgo = new Date(today - 30 * 24 * 60 * 60 * 1000);

  // Get student's analytics
  const userAnalytics = await analyticsService.getUserAnalytics(
    studentId,
    thirtyDaysAgo,
    today
  );

  // Get enrolled courses with progress
  const enrolledCourses = await Progress.find({ student: studentId })
    .populate('course', 'title instructor thumbnail')
    .sort({ lastAccessedAt: -1 });

  // Get upcoming quizzes
  const upcomingQuizzes = await Quiz.find({
    course: { $in: enrolledCourses.map(e => e.course._id) },
    endDate: { $gte: today },
    isPublished: true
  })
    .populate('course', 'title')
    .sort({ startDate: 1 })
    .limit(5);

  // Get recommended courses based on preferences and progress
  const recommendedCourses = await Course.aggregate([
    {
      $match: {
        _id: { $nin: enrolledCourses.map(e => e.course._id) },
        isPublished: true
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "instructor",
        foreignField: "_id",
        as: "instructorDetails"
      }
    },
    { $sample: { size: 5 } },
    {
      $project: {
        title: 1,
        thumbnail: 1,
        instructor: { $arrayElemAt: ["$instructorDetails.fullName", 0] },
        rating: "$ratings.average",
        enrollmentCount: "$enrolledStudents"
      }
    }
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          userAnalytics,
          enrolledCourses,
          upcomingQuizzes,
          recommendedCourses
        },
        "Student dashboard data fetched successfully"
      )
    );
});

export {
  getAdminDashboard,
  getInstructorDashboard,
  getStudentDashboard
};