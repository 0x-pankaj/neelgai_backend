import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Course } from "../models/course.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import slugify from "slugify";

const createCourse = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    category,
    level,
    prerequisites,
    outcomes,
    pricing,
    tags
  } = req.body;

  if (!title || !description || !category || !level) {
    throw new ApiError(400, "All required fields must be provided");
  }

  // Check if instructor is authorized
  if (req.user.role !== "INSTRUCTOR" && req.user.role !== "ADMIN") {
    throw new ApiError(403, "Only instructors can create courses");
  }

  // Handle thumbnail upload
  const thumbnailLocalPath = req.file?.path;
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Course thumbnail is required");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnail.url) {
    throw new ApiError(400, "Thumbnail upload failed");
  }

  // Create course with initial empty modules
  const course = await Course.create({
    title,
    slug: slugify(title, { lower: true }),
    description,
    thumbnail: thumbnail.url,
    instructor: req.user._id,
    category,
    level,
    prerequisites: prerequisites || [],
    outcomes: outcomes || [],
    tags: tags || [],
    pricing: pricing || { isFree: true },
    modules: []
  });

  return res
    .status(201)
    .json(new ApiResponse(201, course, "Course created successfully"));
});

const addModule = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "Module title and description are required");
  }

  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  // Verify instructor ownership
  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to modify this course");
  }

  const moduleOrder = course.modules.length + 1;
  course.modules.push({
    title,
    description,
    order: moduleOrder,
    lectures: []
  });

  await course.save();

  return res
    .status(200)
    .json(new ApiResponse(200, course, "Module added successfully"));
});

const addLecture = asyncHandler(async (req, res) => {
  const { courseId, moduleId } = req.params;
  const { title, description, duration } = req.body;

  if (!title || !description || !duration) {
    throw new ApiError(400, "All lecture fields are required");
  }

  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  // Verify instructor ownership
  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to modify this course");
  }

  const module = course.modules.id(moduleId);
  if (!module) {
    throw new ApiError(404, "Module not found");
  }

  // Handle video upload
  const videoLocalPath = req.file?.path;
  if (!videoLocalPath) {
    throw new ApiError(400, "Lecture video is required");
  }

  const video = await uploadOnCloudinary(videoLocalPath);
  if (!video.url) {
    throw new ApiError(400, "Video upload failed");
  }

  const lectureOrder = module.lectures.length + 1;
  module.lectures.push({
    title,
    description,
    videoUrl: video.url,
    duration,
    order: lectureOrder,
    resources: []
  });

  await course.save();

  return res
    .status(200)
    .json(new ApiResponse(200, course, "Lecture added successfully"));
});

const addLectureResource = asyncHandler(async (req, res) => {
  const { courseId, moduleId, lectureId } = req.params;
  const { title, type } = req.body;

  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  // Verify instructor ownership
  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to modify this course");
  }

  const module = course.modules.id(moduleId);
  if (!module) {
    throw new ApiError(404, "Module not found");
  }

  const lecture = module.lectures.id(lectureId);
  if (!lecture) {
    throw new ApiError(404, "Lecture not found");
  }

  // Handle resource file upload
  const resourceLocalPath = req.file?.path;
  if (!resourceLocalPath) {
    throw new ApiError(400, "Resource file is required");
  }

  const resource = await uploadOnCloudinary(resourceLocalPath);
  if (!resource.url) {
    throw new ApiError(400, "Resource upload failed");
  }

  lecture.resources.push({
    title,
    fileUrl: resource.url,
    type
  });

  await course.save();

  return res
    .status(200)
    .json(new ApiResponse(200, course, "Resource added successfully"));
});

const getCourseById = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId)
    .populate('instructor', 'fullName userName avatar')
    .populate('enrolledStudents.student', 'fullName userName avatar');

  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, course, "Course fetched successfully"));
});

const getAllCourses = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    category,
    level,
    search,
    sort = 'createdAt'
  } = req.query;

  const query = {};

  // Apply filters
  if (category) query.category = category;
  if (level) query.level = level;
  if (search) {
    query.$text = { $search: search };
  }

  // Build sort object
  const sortObj = {};
  const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
  sortObj[sortField] = sort.startsWith('-') ? -1 : 1;

  const courses = await Course.find(query)
    .populate('instructor', 'fullName userName avatar')
    .sort(sortObj)
    .limit(limit)
    .skip((page - 1) * limit);

  const total = await Course.countDocuments(query);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          courses,
          total,
          pages: Math.ceil(total / limit),
          currentPage: page
        },
        "Courses fetched successfully"
      )
    );
});

const updateCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const updates = req.body;

  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  // Verify instructor ownership
  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to modify this course");
  }

  // Handle thumbnail update if provided
  if (req.file) {
    const thumbnailLocalPath = req.file.path;
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (thumbnail.url) {
      updates.thumbnail = thumbnail.url;
    }
  }

  // Update slug if title is being updated
  if (updates.title) {
    updates.slug = slugify(updates.title, { lower: true });
  }

  const updatedCourse = await Course.findByIdAndUpdate(
    courseId,
    { $set: updates },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedCourse, "Course updated successfully"));
});

const publishCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  // Verify instructor ownership
  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to modify this course");
  }

  // Verify course has required content
  if (!course.modules.length) {
    throw new ApiError(400, "Course must have at least one module to publish");
  }

  course.isPublished = true;
  course.publishedAt = new Date();
  await course.save();

  return res
    .status(200)
    .json(new ApiResponse(200, course, "Course published successfully"));
});

const addReview = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { rating, review } = req.body;
  
    if (!rating) {
      throw new ApiError(400, "Rating is required");
    }
  
    const course = await Course.findById(courseId);
    if (!course) {
      throw new ApiError(404, "Course not found");
    }
  
    // Verify student is enrolled
    const isEnrolled = course.enrolledStudents.some(
      enrollment => enrollment.student.toString() === req.user._id.toString()
    );
    if (!isEnrolled) {
      throw new ApiError(403, "Only enrolled students can review the course");
    }
  
    // Check if user has already reviewed
    const existingReviewIndex = course.reviews.findIndex(
      r => r.user.toString() === req.user._id.toString()
    );
  
    if (existingReviewIndex !== -1) {
      // Update existing review
      course.reviews[existingReviewIndex] = {
        user: req.user._id,
        rating,
        review,
        createdAt: new Date()
      };
    } else {
      // Add new review
      course.reviews.push({
        user: req.user._id,
        rating,
        review,
        createdAt: new Date()
      });
    }
  
    // Recalculate average rating
    await course.calculateAverageRating();
  
    return res
      .status(200)
      .json(new ApiResponse(200, course, "Review added successfully"));
  });
  
  const markLectureComplete = asyncHandler(async (req, res) => {
    const { courseId, moduleId, lectureId } = req.params;
  
    const course = await Course.findById(courseId);
    if (!course) {
      throw new ApiError(404, "Course not found");
    }
  
    // Find student enrollment
    const enrollment = course.enrolledStudents.find(
      e => e.student.toString() === req.user._id.toString()
    );
    
    if (!enrollment) {
      throw new ApiError(403, "Student not enrolled in this course");
    }
  
    // Verify lecture exists
    const module = course.modules.id(moduleId);
    if (!module) {
      throw new ApiError(404, "Module not found");
    }
  
    const lecture = module.lectures.id(lectureId);
    if (!lecture) {
      throw new ApiError(404, "Lecture not found");
    }
  
    // Mark lecture as completed if not already completed
    if (!enrollment.completedLectures.includes(lecture._id)) {
      enrollment.completedLectures.push(lecture._id);
      await course.save();
    }
  
    return res
      .status(200)
      .json(new ApiResponse(200, course, "Lecture marked as complete"));
  });
  
  const getCourseProgress = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
  
    const course = await Course.findById(courseId);
    if (!course) {
      throw new ApiError(404, "Course not found");
    }
  
    const enrollment = course.enrolledStudents.find(
      e => e.student.toString() === req.user._id.toString()
    );
    
    if (!enrollment) {
      throw new ApiError(403, "Student not enrolled in this course");
    }
  
    // Calculate progress statistics
    const totalLectures = course.modules.reduce(
      (sum, module) => sum + module.lectures.length, 
      0
    );
    
    const completedLectures = enrollment.completedLectures.length;
    const progressPercentage = (completedLectures / totalLectures * 100).toFixed(1);
  
    // Get progress by module
    const moduleProgress = course.modules.map(module => {
      const moduleLectures = module.lectures.length;
      const moduleCompleted = module.lectures.filter(lecture => 
        enrollment.completedLectures.includes(lecture._id)
      ).length;
      
      return {
        moduleId: module._id,
        title: module.title,
        completed: moduleCompleted,
        total: moduleLectures,
        percentage: (moduleCompleted / moduleLectures * 100).toFixed(1)
      };
    });
  
    const progress = {
      totalLectures,
      completedLectures,
      progressPercentage,
      moduleProgress
    };
  
    return res
      .status(200)
      .json(new ApiResponse(200, progress, "Course progress fetched successfully"));
  });
  
  const getInstructorCourses = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 10 } = req.query;
  
    const query = { instructor: req.user._id };
    if (status === 'published') query.isPublished = true;
    if (status === 'draft') query.isPublished = false;
  
    const courses = await Course.find(query)
      .select('-modules.lectures.videoUrl') // Exclude video URLs for performance
      .sort('-createdAt')
      .limit(limit)
      .skip((page - 1) * limit);
  
    const total = await Course.countDocuments(query);
  
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {
            courses,
            total,
            pages: Math.ceil(total / limit),
            currentPage: page
          },
          "Instructor courses fetched successfully"
        )
      );
  });
  
  const getEnrolledStudents = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { page = 1, limit = 10 } = req.query;
  
    const course = await Course.findById(courseId);
    if (!course) {
      throw new ApiError(404, "Course not found");
    }
  
    // Verify instructor ownership
    if (course.instructor.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "Unauthorized to access this information");
    }
  
    const students = await Course.findById(courseId)
      .select('enrolledStudents')
      .populate({
        path: 'enrolledStudents.student',
        select: 'fullName userName email avatar'
      })
      .slice('enrolledStudents', [(page - 1) * limit, limit]);
  
    const total = course.enrolledStudents.length;
  
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {
            students: students.enrolledStudents,
            total,
            pages: Math.ceil(total / limit),
            currentPage: page
          },
          "Enrolled students fetched successfully"
        )
      );
  });
  
  export {
    createCourse,
    addModule,
    addLecture,
    addLectureResource,
    getCourseById,
    getAllCourses,
    updateCourse,
    publishCourse,
    addReview,
    markLectureComplete,
    getCourseProgress,
    getInstructorCourses,
    getEnrolledStudents
  };