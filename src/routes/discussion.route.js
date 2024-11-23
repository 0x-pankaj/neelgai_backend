import { Router } from "express";
import {
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
} from "../controllers/discussion.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Discussion listing and creation
router.route("/")
  .get(getDiscussions)
  .post(
    upload.array("attachments", 5),
    createDiscussion
  );

// Course statistics
router.route("/courses/:courseId/stats")
  .get(getDiscussionStats);

// Individual discussion routes
router.route("/:discussionId")
  .get(getDiscussionById)
  .patch(
    upload.array("attachments", 5),
    updateDiscussion
  );

// Comments
router.route("/:discussionId/comments")
  .post(
    upload.array("attachments", 3),
    addComment
  );

router.route("/:discussionId/comments/:commentId")
  .patch(
    upload.array("attachments", 3),
    updateComment
  )
  .delete(deleteComment);

// Voting
router.route("/:discussionId/vote")
  .post(voteDiscussion);

router.route("/:discussionId/comments/:commentId/vote")
  .post(voteComment);

// Following
router.route("/:discussionId/follow")
  .post(toggleFollowDiscussion);

// Resolution
router.route("/:discussionId/resolve")
  .patch(markAsResolved);

export default router;