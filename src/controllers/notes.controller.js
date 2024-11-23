import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Note } from "../models/notes.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const createNote = asyncHandler(async (req, res) => {
  const {
    title,
    content,
    courseId,
    moduleId,
    lectureId,
    tags,
    reminder,
    color
  } = req.body;

  if (!title || !content) {
    throw new ApiError(400, "Title and content are required");
  }

  // Handle attachments if any
  const attachments = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const uploadedFile = await uploadOnCloudinary(file.path);
      if (uploadedFile) {
        attachments.push({
          type: getFileType(file.mimetype),
          url: uploadedFile.url,
          name: file.originalname,
          size: file.size,
          mimeType: file.mimetype
        });
      }
    }
  }

  const note = await Note.create({
    title,
    content,
    student: req.user._id,
    course: courseId,
    module: moduleId,
    lecture: lectureId,
    tags: tags || [],
    attachments,
    reminder: reminder ? {
      dueDate: new Date(reminder),
      status: "PENDING"
    } : undefined,
    color
  });

  return res
    .status(201)
    .json(new ApiResponse(201, note, "Note created successfully"));
});

const updateNote = asyncHandler(async (req, res) => {
  const { noteId } = req.params;
  const updates = req.body;

  const note = await Note.findById(noteId);
  if (!note) {
    throw new ApiError(404, "Note not found");
  }

  // Check ownership or edit permission
  if (!canModifyNote(note, req.user._id)) {
    throw new ApiError(403, "Unauthorized to modify this note");
  }

  // Handle attachments if any
  if (req.files && req.files.length > 0) {
    const newAttachments = [];
    for (const file of req.files) {
      const uploadedFile = await uploadOnCloudinary(file.path);
      if (uploadedFile) {
        newAttachments.push({
          type: getFileType(file.mimetype),
          url: uploadedFile.url,
          name: file.originalname,
          size: file.size,
          mimeType: file.mimetype
        });
      }
    }
    updates.attachments = [...(note.attachments || []), ...newAttachments];
  }

  // Update note
  Object.assign(note, updates);
  await note.save();

  return res
    .status(200)
    .json(new ApiResponse(200, note, "Note updated successfully"));
});

const getNotes = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    courseId,
    tags,
    filter,
    sort = 'createdAt'
  } = req.query;

  const query = {
    $or: [
      { student: req.user._id },
      { 'sharedWith.user': req.user._id }
    ]
  };

  // Apply filters
  if (search) {
    query.$text = { $search: search };
  }

  if (courseId) {
    query.course = courseId;
  }

  if (tags) {
    query['tags.name'] = { $in: tags.split(',') };
  }

  switch (filter) {
    case 'pinned':
      query.isPinned = true;
      break;
    case 'favorite':
      query.isFavorite = true;
      break;
    case 'archived':
      query.isArchived = true;
      break;
    case 'shared':
      query['sharedWith.0'] = { $exists: true };
      break;
    default:
      query.isArchived = false;
  }

  // Build sort object
  const sortObj = {};
  const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
  sortObj[sortField] = sort.startsWith('-') ? -1 : 1;

  const notes = await Note.find(query)
    .populate('course', 'title')
    .populate('sharedWith.user', 'fullName avatar')
    .sort(sortObj)
    .limit(limit)
    .skip((page - 1) * limit);

  const total = await Note.countDocuments(query);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          notes,
          total,
          pages: Math.ceil(total / limit),
          currentPage: parseInt(page)
        },
        "Notes fetched successfully"
      )
    );
});

const getNoteById = asyncHandler(async (req, res) => {
  const { noteId } = req.params;

  const note = await Note.findById(noteId)
    .populate('course', 'title')
    .populate('sharedWith.user', 'fullName avatar');

  if (!note) {
    throw new ApiError(404, "Note not found");
  }

  // Check access permission
  if (!canAccessNote(note, req.user._id)) {
    throw new ApiError(403, "Unauthorized to access this note");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, note, "Note fetched successfully"));
});

const shareNote = asyncHandler(async (req, res) => {
  const { noteId } = req.params;
  const { userId, permission } = req.body;

  const note = await Note.findById(noteId);
  if (!note) {
    throw new ApiError(404, "Note not found");
  }

  // Check ownership
  if (note.student.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only note owner can share the note");
  }

  await note.share(userId, permission);

  return res
    .status(200)
    .json(new ApiResponse(200, note, "Note shared successfully"));
});

const unshareNote = asyncHandler(async (req, res) => {
  const { noteId, userId } = req.params;

  const note = await Note.findById(noteId);
  if (!note) {
    throw new ApiError(404, "Note not found");
  }

  // Check ownership
  if (note.student.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only note owner can unshare the note");
  }

  await note.unshare(userId);

  return res
    .status(200)
    .json(new ApiResponse(200, note, "Note unshared successfully"));
});

const togglePinned = asyncHandler(async (req, res) => {
  const { noteId } = req.params;

  const note = await Note.findById(noteId);
  if (!note) {
    throw new ApiError(404, "Note not found");
  }

  // Check ownership
  if (note.student.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to modify this note");
  }

  note.isPinned = !note.isPinned;
  await note.save();

  return res
    .status(200)
    .json(new ApiResponse(
      200,
      note,
      `Note ${note.isPinned ? 'pinned' : 'unpinned'} successfully`
    ));
});

const toggleFavorite = asyncHandler(async (req, res) => {
  const { noteId } = req.params;

  const note = await Note.findById(noteId);
  if (!note) {
    throw new ApiError(404, "Note not found");
  }

  if (!canAccessNote(note, req.user._id)) {
    throw new ApiError(403, "Unauthorized to access this note");
  }

  note.isFavorite = !note.isFavorite;
  await note.save();

  return res
    .status(200)
    .json(new ApiResponse(
      200,
      note,
      `Note ${note.isFavorite ? 'added to' : 'removed from'} favorites`
    ));
});

const archiveNote = asyncHandler(async (req, res) => {
  const { noteId } = req.params;

  const note = await Note.findById(noteId);
  if (!note) {
    throw new ApiError(404, "Note not found");
  }

  // Check ownership
  if (note.student.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to modify this note");
  }

  note.isArchived = !note.isArchived;
  await note.save();

  return res
    .status(200)
    .json(new ApiResponse(
      200,
      note,
      `Note ${note.isArchived ? 'archived' : 'unarchived'} successfully`
    ));
});

const deleteNote = asyncHandler(async (req, res) => {
  const { noteId } = req.params;

  const note = await Note.findById(noteId);
  if (!note) {
    throw new ApiError(404, "Note not found");
  }

  // Check ownership
  if (note.student.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to delete this note");
  }

  await Note.findByIdAndDelete(noteId);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Note deleted successfully"));
})

const getNotesOverview = asyncHandler(async (req, res) => {
    const overview = await Note.getNotesOverview(req.user._id);
  
    // Get recent notes
    const recentNotes = await Note.find({
      student: req.user._id,
      isArchived: false
    })
    .sort('-lastEditedAt')
    .limit(5)
    .select('title lastEditedAt tags course');
  
    // Get reminder notes
    const reminderNotes = await Note.find({
      student: req.user._id,
      'reminder.status': 'PENDING',
      'reminder.dueDate': { $gte: new Date() }
    })
    .sort('reminder.dueDate')
    .select('title reminder tags');
  
    // Get shared notes count
    const sharedWithMe = await Note.countDocuments({
      'sharedWith.user': req.user._id
    });
  
    const response = {
      overview: overview[0] || {},
      recentNotes,
      reminderNotes,
      sharedWithMe
    };
  
    return res
      .status(200)
      .json(new ApiResponse(200, response, "Notes overview fetched successfully"));
  });
  
  const updateNoteReminder = asyncHandler(async (req, res) => {
    const { noteId } = req.params;
    const { dueDate, status } = req.body;
  
    const note = await Note.findById(noteId);
    if (!note) {
      throw new ApiError(404, "Note not found");
    }
  
    if (!canModifyNote(note, req.user._id)) {
      throw new ApiError(403, "Unauthorized to modify this note");
    }
  
    if (dueDate) {
      note.reminder = {
        dueDate: new Date(dueDate),
        status: "PENDING",
        notificationSent: false
      };
    } else if (status) {
      if (!note.reminder) {
        throw new ApiError(400, "No reminder exists for this note");
      }
      note.reminder.status = status;
    }
  
    await note.save();
  
    return res
      .status(200)
      .json(new ApiResponse(200, note, "Reminder updated successfully"));
  });
  
  const addNoteAttachment = asyncHandler(async (req, res) => {
    const { noteId } = req.params;
    
    if (!req.file) {
      throw new ApiError(400, "Attachment file is required");
    }
  
    const note = await Note.findById(noteId);
    if (!note) {
      throw new ApiError(404, "Note not found");
    }
  
    if (!canModifyNote(note, req.user._id)) {
      throw new ApiError(403, "Unauthorized to modify this note");
    }
  
    const uploadedFile = await uploadOnCloudinary(req.file.path);
    if (!uploadedFile) {
      throw new ApiError(500, "Error uploading attachment");
    }
  
    const attachment = {
      type: getFileType(req.file.mimetype),
      url: uploadedFile.url,
      name: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype
    };
  
    note.attachments.push(attachment);
    await note.save();
  
    return res
      .status(200)
      .json(new ApiResponse(200, note, "Attachment added successfully"));
  });
  
  const removeNoteAttachment = asyncHandler(async (req, res) => {
    const { noteId, attachmentId } = req.params;
  
    const note = await Note.findById(noteId);
    if (!note) {
      throw new ApiError(404, "Note not found");
    }
  
    if (!canModifyNote(note, req.user._id)) {
      throw new ApiError(403, "Unauthorized to modify this note");
    }
  
    note.attachments = note.attachments.filter(
      attachment => attachment._id.toString() !== attachmentId
    );
  
    await note.save();
  
    return res
      .status(200)
      .json(new ApiResponse(200, note, "Attachment removed successfully"));
  });
  
  // Helper Functions
  const canModifyNote = (note, userId) => {
    if (note.student.toString() === userId.toString()) return true;
    
    const sharedPermission = note.sharedWith.find(
      share => share.user.toString() === userId.toString()
    );
    return sharedPermission?.permission === "EDIT";
  };
  
  const canAccessNote = (note, userId) => {
    if (note.student.toString() === userId.toString()) return true;
    
    return note.sharedWith.some(
      share => share.user.toString() === userId.toString()
    );
  };
  
  const getFileType = (mimeType) => {
    if (mimeType.startsWith('image/')) return "IMAGE";
    if (mimeType === 'application/pdf') return "PDF";
    if (mimeType.includes('document')) return "DOCUMENT";
    return "DOCUMENT";
  };
  
  export {
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
  };