import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Discussion, Comment } from "../models/discussion.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";

const createDiscussion = asyncHandler(async (req, res) => {
  const {
    title,
    content,
    courseId,
    moduleId,
    lectureId,
    category,
    tags,
    isAnnouncement
  } = req.body;

  if (!title || !content || !courseId) {
    throw new ApiError(400, "Required fields missing");
  }

  // Handle attachments if any
  const attachments = [];
  if (req.files?.length > 0) {
    for (const file of req.files) {
      const uploadedFile = await uploadOnCloudinary(file.path);
      if (uploadedFile) {
        attachments.push({
          type: getFileType(file.mimetype),
          url: uploadedFile.url,
          name: file.originalname
        });
      }
    }
  }

  // Check if user can create announcements
  if (isAnnouncement && !["INSTRUCTOR", "ADMIN"].includes(req.user.role)) {
    throw new ApiError(403, "Only instructors can create announcements");
  }

  const discussion = await Discussion.create({
    title,
    content,
    author: req.user._id,
    course: courseId,
    module: moduleId,
    lecture: lectureId,
    category: category || "GENERAL",
    tags: tags || [],
    attachments,
    isAnnouncement: isAnnouncement && ["INSTRUCTOR", "ADMIN"].includes(req.user.role),
    participants: [req.user._id]
  });

  return res
    .status(201)
    .json(new ApiResponse(201, discussion, "Discussion created successfully"));
});

const getDiscussions = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    courseId,
    moduleId,
    category,
    status,
    sort = "-lastActivity",
    search,
    filter
  } = req.query;

  const query = {};

  // Apply filters
  if (courseId) query.course = courseId;
  if (moduleId) query.module = moduleId;
  if (category) query.category = category;
  if (status) query.status = status;

  if (search) {
    query.$text = { $search: search };
  }

  switch (filter) {
    case "my-discussions":
      query.author = req.user._id;
      break;
    case "participating":
      query.participants = req.user._id;
      break;
    case "following":
      query.followers = req.user._id;
      break;
    case "unresolved":
      query.isResolved = false;
      break;
    case "announcements":
      query.isAnnouncement = true;
      break;
  }

  // Build sort object
  let sortObj = {};
  if (sort.startsWith("-")) {
    sortObj[sort.slice(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  const discussions = await Discussion.find(query)
    .populate("author", "fullName userName avatar")
    .populate("resolvedBy", "fullName userName")
    .select("-comments")
    .sort(sortObj)
    .limit(limit)
    .skip((page - 1) * limit);

  const total = await Discussion.countDocuments(query);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          discussions,
          total,
          pages: Math.ceil(total / limit),
          currentPage: parseInt(page)
        },
        "Discussions fetched successfully"
      )
    );
});

const getDiscussionById = asyncHandler(async (req, res) => {
  const { discussionId } = req.params;

  const discussion = await Discussion.findById(discussionId)
    .populate("author", "fullName userName avatar")
    .populate("resolvedBy", "fullName userName")
    .populate({
      path: "comments",
      populate: [
        {
          path: "author",
          select: "fullName userName avatar"
        },
        {
          path: "replies",
          populate: {
            path: "author",
            select: "fullName userName avatar"
          }
        }
      ]
    })
    .populate("participants", "fullName userName avatar");

  if (!discussion) {
    throw new ApiError(404, "Discussion not found");
  }

  // Increment view count if viewer is not author
  if (discussion.author._id.toString() !== req.user._id.toString()) {
    discussion.viewCount += 1;
    await discussion.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, discussion, "Discussion fetched successfully"));
});

const updateDiscussion = asyncHandler(async (req, res) => {
  const { discussionId } = req.params;
  const updates = req.body;

  const discussion = await Discussion.findById(discussionId);
  if (!discussion) {
    throw new ApiError(404, "Discussion not found");
  }

  // Check permission to update
  if (
    discussion.author.toString() !== req.user._id.toString() &&
    !["INSTRUCTOR", "ADMIN"].includes(req.user.role)
  ) {
    throw new ApiError(403, "Unauthorized to update this discussion");
  }

  // Handle attachments if any
  if (req.files?.length > 0) {
    const newAttachments = [];
    for (const file of req.files) {
      const uploadedFile = await uploadOnCloudinary(file.path);
      if (uploadedFile) {
        newAttachments.push({
          type: getFileType(file.mimetype),
          url: uploadedFile.url,
          name: file.originalname
        });
      }
    }
    updates.attachments = [...(discussion.attachments || []), ...newAttachments];
  }

  // Mark as edited
  updates.isEdited = true;

  Object.assign(discussion, updates);
  await discussion.save();

  return res
    .status(200)
    .json(new ApiResponse(200, discussion, "Discussion updated successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  const { discussionId } = req.params;
  const { content, parentCommentId } = req.body;

  if (!content) {
    throw new ApiError(400, "Comment content is required");
  }

  const discussion = await Discussion.findById(discussionId);
  if (!discussion) {
    throw new ApiError(404, "Discussion not found");
  }

  // Handle attachments if any
  const attachments = [];
  if (req.files?.length > 0) {
    for (const file of req.files) {
      const uploadedFile = await uploadOnCloudinary(file.path);
      if (uploadedFile) {
        attachments.push({
          type: getFileType(file.mimetype),
          url: uploadedFile.url,
          name: file.originalname
        });
      }
    }
  }

  const comment = {
    content,
    author: req.user._id,
    attachments,
    parentComment: parentCommentId
  };

  await discussion.addComment(comment);
  
    // Populate the new comment
    const populatedDiscussion = await Discussion.findById(discussionId)
      .populate("comments.author", "fullName userName avatar")
      .populate({
        path: "comments.replies",
        populate: {
          path: "author",
          select: "fullName userName avatar"
        }
      });
  
    return res
      .status(200)
      .json(new ApiResponse(200, populatedDiscussion, "Comment added successfully"));
  });
  
  const updateComment = asyncHandler(async (req, res) => {
    const { discussionId, commentId } = req.params;
    const { content } = req.body;
  
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      throw new ApiError(404, "Discussion not found");
    }
  
    const comment = discussion.comments.id(commentId);
    if (!comment) {
      throw new ApiError(404, "Comment not found");
    }
  
    // Check permission to update
    if (comment.author.toString() !== req.user._id.toString() &&
      !["INSTRUCTOR", "ADMIN"].includes(req.user.role)) {
      throw new ApiError(403, "Unauthorized to update this comment");
    }
  
    // Handle attachments if any
    if (req.files?.length > 0) {
      const newAttachments = [];
      for (const file of req.files) {
        const uploadedFile = await uploadOnCloudinary(file.path);
        if (uploadedFile) {
          newAttachments.push({
            type: getFileType(file.mimetype),
            url: uploadedFile.url,
            name: file.originalname
          });
        }
      }
      comment.attachments = [...(comment.attachments || []), ...newAttachments];
    }
  
    comment.content = content;
    comment.isEdited = true;
    await discussion.save();
  
    return res
      .status(200)
      .json(new ApiResponse(200, discussion, "Comment updated successfully"));
  });
  
  const deleteComment = asyncHandler(async (req, res) => {
    const { discussionId, commentId } = req.params;
  
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      throw new ApiError(404, "Discussion not found");
    }
  
    const comment = discussion.comments.id(commentId);
    if (!comment) {
      throw new ApiError(404, "Comment not found");
    }
  
    // Check permission to delete
    if (comment.author.toString() !== req.user._id.toString() &&
      !["INSTRUCTOR", "ADMIN"].includes(req.user.role)) {
      throw new ApiError(403, "Unauthorized to delete this comment");
    }
  
    comment.remove();
    await discussion.save();
  
    return res
      .status(200)
      .json(new ApiResponse(200, discussion, "Comment deleted successfully"));
  });
  
  const voteDiscussion = asyncHandler(async (req, res) => {
    const { discussionId } = req.params;
    const { voteType } = req.body;
  
    if (!["UPVOTE", "DOWNVOTE"].includes(voteType)) {
      throw new ApiError(400, "Invalid vote type");
    }
  
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      throw new ApiError(404, "Discussion not found");
    }
  
    await discussion.vote(req.user._id, voteType);
  
    return res
      .status(200)
      .json(new ApiResponse(200, discussion, "Vote recorded successfully"));
  });
  
  const voteComment = asyncHandler(async (req, res) => {
    const { discussionId, commentId } = req.params;
    const { voteType } = req.body;
  
    if (!["UPVOTE", "DOWNVOTE"].includes(voteType)) {
      throw new ApiError(400, "Invalid vote type");
    }
  
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      throw new ApiError(404, "Discussion not found");
    }
  
    const comment = discussion.comments.id(commentId);
    if (!comment) {
      throw new ApiError(404, "Comment not found");
    }
  
    const existingVote = comment.votes.find(
      vote => vote.user.toString() === req.user._id.toString()
    );
  
    if (existingVote) {
      if (existingVote.voteType === voteType) {
        // Remove vote if same type
        comment.votes = comment.votes.filter(
          vote => vote.user.toString() !== req.user._id.toString()
        );
      } else {
        // Update vote type if different
        existingVote.voteType = voteType;
      }
    } else {
      // Add new vote
      comment.votes.push({ user: req.user._id, voteType });
    }
  
    await discussion.save();
  
    return res
      .status(200)
      .json(new ApiResponse(200, discussion, "Comment vote recorded successfully"));
  });
  
  const toggleFollowDiscussion = asyncHandler(async (req, res) => {
    const { discussionId } = req.params;
  
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      throw new ApiError(404, "Discussion not found");
    }
  
    await discussion.toggleFollow(req.user._id);
  
    return res
      .status(200)
      .json(new ApiResponse(
        200,
        discussion,
        `Successfully ${discussion.followers.includes(req.user._id) ? 'followed' : 'unfollowed'} discussion`
      ));
  });
  
  const markAsResolved = asyncHandler(async (req, res) => {
    const { discussionId } = req.params;
  
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      throw new ApiError(404, "Discussion not found");
    }
  
    // Check permission to mark as resolved
    if (discussion.author.toString() !== req.user._id.toString() &&
      !["INSTRUCTOR", "ADMIN"].includes(req.user.role)) {
      throw new ApiError(403, "Unauthorized to mark this discussion as resolved");
    }
  
    discussion.isResolved = true;
    discussion.resolvedBy = req.user._id;
    discussion.resolvedAt = new Date();
    await discussion.save();
  
    return res
      .status(200)
      .json(new ApiResponse(200, discussion, "Discussion marked as resolved"));
  });
  
  const getDiscussionStats = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
  
    const stats = await Discussion.aggregate([
      { $match: { course: new mongoose.Types.ObjectId(courseId) } },
      {
        $group: {
          _id: null,
          totalDiscussions: { $sum: 1 },
          resolvedDiscussions: {
            $sum: { $cond: [{ $eq: ["$isResolved", true] }, 1, 0] }
          },
          totalComments: { $sum: { $size: "$comments" } },
          totalParticipants: { $addToSet: "$participants" },
          categoryDistribution: {
            $push: {
              category: "$category",
              count: 1
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalDiscussions: 1,
          resolvedDiscussions: 1,
          totalComments: 1,
          totalParticipants: { $size: "$totalParticipants" },
          resolutionRate: {
            $multiply: [
              { $divide: ["$resolvedDiscussions", "$totalDiscussions"] },
              100
            ]
          },
          categoryDistribution: 1
        }
      }
    ]);
  
    // Get most engaged discussions
    const mostEngaged = await Discussion.getMostEngaged(courseId);
  
    return res
      .status(200)
      .json(new ApiResponse(
        200,
        {
          stats: stats[0] || {},
          mostEngaged
        },
        "Discussion statistics fetched successfully"
      ));
  });
  
  // Helper function to determine file type
  const getFileType = (mimeType) => {
    if (mimeType.startsWith('image/')) return "IMAGE";
    if (mimeType === 'application/pdf') return "PDF";
    if (mimeType.includes('document')) return "DOCUMENT";
    return "DOCUMENT";
  };
  
  export {
    createDiscussion,
    getDiscussions,
    getDiscussionById,
    updateDiscussion,
    addComment,
    updateComment,
    deleteComment,
    voteDiscussion,
    voteComment,
    toggleFollowDiscussion,
    markAsResolved,
    getDiscussionStats
  };