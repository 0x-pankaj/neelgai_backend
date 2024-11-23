import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { analyticsService } from "../services/analytics.service.js";

const getPlatformAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    throw new ApiError(400, "Start date and end date are required");
  }

  const metrics = await analyticsService.getPlatformMetrics(startDate, endDate);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        metrics,
        "Platform analytics fetched successfully"
      )
    );
});

const getUserAnalytics = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    throw new ApiError(400, "Start date and end date are required");
  }

  // Check permission
  if (req.user._id.toString() !== userId && 
      !["INSTRUCTOR", "ADMIN"].includes(req.user.role)) {
    throw new ApiError(403, "Unauthorized to view these analytics");
  }

  const analytics = await analyticsService.getUserAnalytics(
    userId,
    startDate,
    endDate
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        analytics,
        "User analytics fetched successfully"
      )
    );
});

const getCourseAnalytics = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    throw new ApiError(400, "Start date and end date are required");
  }

  const analytics = await analyticsService.getCourseAnalytics(
    courseId,
    startDate,
    endDate
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        analytics,
        "Course analytics fetched successfully"
      )
    );
});

const getInstructorAnalytics = asyncHandler(async (req, res) => {
  const { instructorId } = req.params;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    throw new ApiError(400, "Start date and end date are required");
  }

  // Check permission
  if (req.user._id.toString() !== instructorId && 
      !["ADMIN"].includes(req.user.role)) {
    throw new ApiError(403, "Unauthorized to view these analytics");
  }

  const analytics = await analyticsService.getInstructorAnalytics(
    instructorId,
    startDate,
    endDate
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        analytics,
        "Instructor analytics fetched successfully"
      )
    );
});

const updateAnalytics = asyncHandler(async (req, res) => {
  const { type, id } = req.params;

  if (!["platform", "user", "course", "instructor"].includes(type)) {
    throw new ApiError(400, "Invalid analytics type");
  }

  if (type !== "platform" && !id) {
    throw new ApiError(400, "ID is required for this analytics type");
  }

  switch (type) {
    case "platform":
      await analyticsService.updatePlatformMetrics();
      break;
    case "user":
      await analyticsService.updateUserAnalytics(id);
      break;
    case "course":
      await analyticsService.updateCourseAnalytics(id);
      break;
    case "instructor":
      await analyticsService.updateInstructorAnalytics(id);
      break;
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        `${type} analytics updated successfully`
      )
    );
});

export {
  getPlatformAnalytics,
  getUserAnalytics,
  getCourseAnalytics,
  getInstructorAnalytics,
  updateAnalytics
};