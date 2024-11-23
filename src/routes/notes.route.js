import { Router } from "express";
import {
  createNote,
  updateNote,
  getNotes,
  getNoteById,
  shareNote,
  unshareNote,
  togglePinned,
  toggleFavorite,
  archiveNote,
  deleteNote,
  getNotesOverview,
  updateNoteReminder,
  addNoteAttachment,
  removeNoteAttachment
} from "../controllers/notes.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Overview and listing routes
router.route("/overview")
  .get(getNotesOverview);

router.route("/")
  .get(getNotes)
  .post(
    upload.array("attachments", 5), // Allow up to 5 attachments
    createNote
  );

// Individual note routes
router.route("/:noteId")
  .get(getNoteById)
  .patch(
    upload.array("attachments", 5),
    updateNote
  )
  .delete(deleteNote);

// Note actions
router.route("/:noteId/share")
  .post(shareNote);

router.route("/:noteId/share/:userId")
  .delete(unshareNote);

router.route("/:noteId/pin")
  .patch(togglePinned);

router.route("/:noteId/favorite")
  .patch(toggleFavorite);

router.route("/:noteId/archive")
  .patch(archiveNote);

// Reminder routes
router.route("/:noteId/reminder")
  .patch(updateNoteReminder);

// Attachment routes
router.route("/:noteId/attachments")
  .post(
    upload.single("attachment"),
    addNoteAttachment
  );

router.route("/:noteId/attachments/:attachmentId")
  .delete(removeNoteAttachment);

export default router;