import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Progress } from "../models/progress.model.js";
import { Course } from "../models/course.model.js";
import mongoose from "mongoose";

const initializeProgress = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  // Check if progress already exists
  const existingProgress = await Progress.findOne({
    student: req.user._id,
    course: courseId
  });

  if (existingProgress) {
    throw new ApiError(400, "Progress already initialized for this course");
  }

  // Get course details to initialize progress
  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  // Initialize module progress
  const moduleProgress = course.modules.map(module => ({
    moduleId: module._id,
    completedLectures: [],
    quizzes: module.quizzes ? module.quizzes.map(quiz => ({
      quizId: quiz._id,
      attempts: []
    })) : [],
    completionStatus: "NOT_STARTED",
    completionPercentage: 0
  }));

  // Calculate total counts
  const totalLectures = course.modules.reduce(
    (sum, module) => sum + module.lectures.length, 
    0
  );
  const totalQuizzes = course.modules.reduce(
    (sum, module) => sum + (module.quizzes?.length || 0), 
    0
  );

  // Create progress record
  const progress = await Progress.create({
    student: req.user._id,
    course: courseId,
    moduleProgress,
    overallProgress: {
      totalModules: course.modules.length,
      totalLectures,
      totalQuizzes,
      completedModules: 0,
      completedLectures: 0,
      completedQuizzes: 0,
      averageQuizScore: 0,
      completionPercentage: 0
    }
  });

  return res
    .status(201)
    .json(new ApiResponse(201, progress, "Progress initialized successfully"));
});

const updateLectureProgress = asyncHandler(async (req, res) => {
  const { courseId, moduleId, lectureId } = req.params;
  const { timeSpent, lastWatchPosition } = req.body;

  const progress = await Progress.findOne({
    student: req.user._id,
    course: courseId
  });

  if (!progress) {
    throw new ApiError(404, "Progress not found");
  }

  const moduleProgress = progress.moduleProgress.find(
    mp => mp.moduleId.toString() === moduleId
  );

  if (!moduleProgress) {
    throw new ApiError(404, "Module progress not found");
  }

  // Update or add lecture completion
  const lectureProgress = moduleProgress.completedLectures.find(
    lp => lp.lectureId.toString() === lectureId
  );

  if (lectureProgress) {
    lectureProgress.timeSpent += timeSpent || 0;
    lectureProgress.lastWatchPosition = lastWatchPosition;
  } else {
    moduleProgress.completedLectures.push({
      lectureId,
      timeSpent: timeSpent || 0,
      lastWatchPosition,
      completedAt: new Date()
    });
  }

  // Log activity
  progress.activityLog.push({
    activityType: "LECTURE_VIEW",
    activityDetail: {
      moduleId,
      lectureId,
      lastWatchPosition
    },
    timeSpent: timeSpent || 0
  });

  // Update last accessed
  progress.lastAccessedAt = new Date();
  progress.timeSpent.total += timeSpent || 0;
  progress.timeSpent.byModule.set(
    moduleId,
    (progress.timeSpent.byModule.get(moduleId) || 0) + (timeSpent || 0)
  );

  // Update overall progress
  await progress.updateProgress();

  return res
    .status(200)
    .json(new ApiResponse(200, progress, "Lecture progress updated successfully"));
});

const updateQuizProgress = asyncHandler(async (req, res) => {
  const { courseId, moduleId, quizId } = req.params;
  const { attemptId, score, maxScore } = req.body;

  const progress = await Progress.findOne({
    student: req.user._id,
    course: courseId
  });

  if (!progress) {
    throw new ApiError(404, "Progress not found");
  }

  const moduleProgress = progress.moduleProgress.find(
    mp => mp.moduleId.toString() === moduleId
  );

  if (!moduleProgress) {
    throw new ApiError(404, "Module progress not found");
  }

  const quizProgress = moduleProgress.quizzes.find(
    qp => qp.quizId.toString() === quizId
  );

  if (!quizProgress) {
    moduleProgress.quizzes.push({
      quizId,
      attempts: [],
      bestScore: 0
    });
  }

  // Add new attempt
  quizProgress.attempts.push({
    attemptId,
    score,
    maxScore,
    completedAt: new Date()
  });

  // Update best score
  quizProgress.bestScore = Math.max(
    quizProgress.bestScore,
    (score / maxScore) * 100
  );

  // Log activity
  progress.activityLog.push({
    activityType: "QUIZ_ATTEMPT",
    activityDetail: {
      moduleId,
      quizId,
      attemptId,
      score,
      maxScore
    }
  });

  // Update progress
  await progress.updateProgress();

  return res
    .status(200)
    .json(new ApiResponse(200, progress, "Quiz progress updated successfully"));
});

const getStudentProgress = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const progress = await Progress.findOne({
    student: req.user._id,
    course: courseId
  }).populate('course', 'title modules');

  if (!progress) {
    throw new ApiError(404, "Progress not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, progress, "Progress fetched successfully"));
});

const getStudentOverview = asyncHandler(async (req, res) => {
    const studentId = req.user._id;
  
    // Get overall statistics
    const overview = await Progress.getStudentOverview(studentId);
    
    // Get active courses progress
    const activeProgress = await Progress.find({
      student: studentId,
      status: "ACTIVE"
    })
    .populate('course', 'title thumbnail')
    .select('overallProgress lastAccessedAt timeSpent studyStreak');
  
    // Get recent activity
    const recentActivity = await Progress.aggregate([
      { $match: { student: new mongoose.Types.ObjectId(studentId) } },
      { $unwind: "$activityLog" },
      { $sort: { "activityLog.completedAt": -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          as: "courseDetails"
        }
      },
      {
        $project: {
          activity: "$activityLog",
          courseName: { $arrayElemAt: ["$courseDetails.title", 0] }
        }
      }
    ]);
  
    const response = {
      overview: overview[0] || {},
      activeCourses: activeProgress,
      recentActivity,
      studyStats: {
        currentStreak: Math.max(...activeProgress.map(p => p.studyStreak.currentStreak)),
        longestStreak: Math.max(...activeProgress.map(p => p.studyStreak.longestStreak)),
        totalTimeSpent: activeProgress.reduce((sum, p) => sum + p.timeSpent.total, 0)
      }
    };
  
    return res
      .status(200)
      .json(new ApiResponse(200, response, "Student overview fetched successfully"));
  });
  
  const getModuleProgress = asyncHandler(async (req, res) => {
    const { courseId, moduleId } = req.params;
  
    const progress = await Progress.findOne({
      student: req.user._id, 
      course: courseId
    }).select('moduleProgress');
  
    if (!progress) {
      throw new ApiError(404, "Progress not found");
    }
  
    const moduleProgress = progress.moduleProgress.find(
      mp => mp.moduleId.toString() === moduleId
    );
  
    if (!moduleProgress) {
      throw new ApiError(404, "Module progress not found");
    }
  
    return res
      .status(200)
      .json(new ApiResponse(200, moduleProgress, "Module progress fetched successfully"));
  });
  
  const generateCertificate = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
  
    const progress = await Progress.findOne({
      student: req.user._id,
      course: courseId
    });
  
    if (!progress) {
      throw new ApiError(404, "Progress not found");
    }
  
    if (progress.overallProgress.completionPercentage < 100) {
      throw new ApiError(400, "Course not completed yet");
    }
  
    // Check if certificate already exists
    const existingCertificate = progress.certificates.find(
      cert => cert.type === "COMPLETION"
    );
  
    if (existingCertificate) {
      return res
        .status(200)
        .json(new ApiResponse(
          200,
          existingCertificate,
          "Certificate already generated"
        ));
    }
  
    // Generate certificate (You would implement actual certificate generation here)
    const certificateUrl = await generateCertificateDocument(progress);
  
    progress.certificates.push({
      type: "COMPLETION",
      certificateUrl
    });
  
    await progress.save();
  
    return res
      .status(200)
      .json(new ApiResponse(
        200,
        progress.certificates[progress.certificates.length - 1],
        "Certificate generated successfully"
      ));
  });
  
  const getCourseAnalytics = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
  
    // Verify instructor permission
    const course = await Course.findById(courseId);
    if (!course || course.instructor.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "Unauthorized to view course analytics");
    }
  
    const analytics = await Progress.aggregate([
      { $match: { course: new mongoose.Types.ObjectId(courseId) } },
      {
        $group: {
          _id: null,
          totalStudents: { $sum: 1 },
          activeStudents: {
            $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] }
          },
          completedStudents: {
            $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] }
          },
          averageProgress: { $avg: "$overallProgress.completionPercentage" },
          averageTimeSpent: { $avg: "$timeSpent.total" },
          totalQuizAttempts: {
            $sum: {
              $reduce: {
                input: "$moduleProgress.quizzes",
                initialValue: 0,
                in: { $add: ["$$value", { $size: "$$this.attempts" }] }
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalStudents: 1,
          activeStudents: 1,
          completedStudents: 1,
          averageProgress: { $round: ["$averageProgress", 2] },
          averageTimeSpent: { $round: ["$averageTimeSpent", 2] },
          totalQuizAttempts: 1
        }
      }
    ]);
  
    // Get module-wise completion stats
    const moduleStats = await Progress.aggregate([
      { $match: { course: new mongoose.Types.ObjectId(courseId) } },
      { $unwind: "$moduleProgress" },
      {
        $group: {
          _id: "$moduleProgress.moduleId",
          completedCount: {
            $sum: {
              $cond: [
                { $eq: ["$moduleProgress.completionStatus", "COMPLETED"] },
                1,
                0
              ]
            }
          },
          averageCompletion: { $avg: "$moduleProgress.completionPercentage" }
        }
      }
    ]);
  
    return res
      .status(200)
      .json(new ApiResponse(
        200,
        {
          courseStats: analytics[0] || {},
          moduleStats
        },
        "Course analytics fetched successfully"
      ));
  });
  
  // Helper function to generate certificate (placeholder)
  const generateCertificateDocument = async (progress) => {
    // Implement certificate generation logic here
    return `https://example.com/certificates/${progress._id}`;
  };
  
  export {
    initializeProgress,
    updateLectureProgress,
    updateQuizProgress,
    getStudentProgress,
    getStudentOverview,
    getModuleProgress,
    generateCertificate,
    getCourseAnalytics
  };