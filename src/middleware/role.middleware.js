import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const isInstructor = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "INSTRUCTOR" && req.user.role !== "ADMIN") {
    throw new ApiError(
      403, 
      "Access denied. Only instructors can perform this action"
    );
  }
  next();
});

export const isAdmin = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    throw new ApiError(
      403, 
      "Access denied. Only admins can perform this action"
    );
  }
  next();
});

export const isStudent = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "STUDENT" && req.user.role !== "ADMIN") {
    throw new ApiError(
      403, 
      "Access denied. Only students can perform this action"
    );
  }
  next();
});