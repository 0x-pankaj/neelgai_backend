import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Quiz } from "../models/quiz.model.js";
import { Course } from "../models/course.model.js";

const createQuiz = asyncHandler(async (req, res) => {
  const {
    title,
    courseId,
    moduleId,
    description,
    instructions,
    duration,
    passingPercentage,
    settings,
    startDate,
    endDate
  } = req.body;

  // Validate required fields
  if (!title || !courseId || !moduleId || !description || !duration) {
    throw new ApiError(400, "All required fields must be provided");
  }

  // Verify course exists and instructor has access
  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to create quiz for this course");
  }

  // Create quiz
  const quiz = await Quiz.create({
    title,
    course: courseId,
    module: moduleId,
    description,
    instructions: instructions || [],
    duration,
    passingPercentage: passingPercentage || 50,
    settings: settings || {},
    startDate,
    endDate,
    createdBy: req.user._id,
    questions: []
  });

  return res
    .status(201)
    .json(new ApiResponse(201, quiz, "Quiz created successfully"));
});

const addQuestion = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const {
    questionText,
    questionType,
    options,
    correctAnswer,
    marks,
    explanation,
    difficultyLevel
  } = req.body;

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw new ApiError(404, "Quiz not found");
  }

  // Verify instructor access
  if (quiz.createdBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to modify this quiz");
  }

  // Validate question data based on type
  if (!questionText || !questionType || !marks) {
    throw new ApiError(400, "Required question fields missing");
  }

  if (
    ["MULTIPLE_CHOICE", "SINGLE_CHOICE", "TRUE_FALSE"].includes(questionType) &&
    (!options || options.length === 0)
  ) {
    throw new ApiError(400, "Options are required for this question type");
  }

  if (questionType === "SHORT_ANSWER" && !correctAnswer) {
    throw new ApiError(400, "Correct answer is required for short answer questions");
  }

  // Add question to quiz
  quiz.questions.push({
    questionText,
    questionType,
    options: options || [],
    correctAnswer,
    marks,
    explanation,
    difficultyLevel
  });

  // Recalculate total marks
  quiz.calculateTotalMarks();
  await quiz.save();

  return res
    .status(200)
    .json(new ApiResponse(200, quiz, "Question added successfully"));
});

const startQuizAttempt = asyncHandler(async (req, res) => {
  const { quizId } = req.params;

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw new ApiError(404, "Quiz not found");
  }

  // Check if quiz is published and within time bounds
  if (!quiz.isPublished) {
    throw new ApiError(400, "Quiz is not published");
  }

  if (quiz.startDate && new Date() < quiz.startDate) {
    throw new ApiError(400, "Quiz has not started yet");
  }

  if (quiz.endDate && new Date() > quiz.endDate) {
    throw new ApiError(400, "Quiz has ended");
  }

  // Check previous attempts
  const userAttempts = quiz.attempts.filter(
    attempt => attempt.student.toString() === req.user._id.toString()
  );

  if (userAttempts.length >= quiz.settings.maxAttempts) {
    throw new ApiError(400, "Maximum attempts reached for this quiz");
  }

  // Create new attempt
  const questions = quiz.settings.shuffleQuestions ? 
    shuffleArray([...quiz.questions]) : 
    quiz.questions;

  // If shuffle options is enabled, create a copy of questions with shuffled options
  const preparedQuestions = questions.map(question => {
    const q = question.toObject();
    if (quiz.settings.shuffleOptions && ['MULTIPLE_CHOICE', 'SINGLE_CHOICE'].includes(q.questionType)) {
      q.options = shuffleArray([...q.options]);
    }
    // Remove correct answers and explanations
    q.options = q.options.map(opt => ({
      _id: opt._id,
      text: opt.text
    }));
    delete q.correctAnswer;
    delete q.explanation;
    return q;
  });

  const attempt = {
    student: req.user._id,
    startedAt: new Date(),
    status: "IN_PROGRESS",
    responses: preparedQuestions.map(q => ({
      question: q._id,
      selectedOptions: [],
      textAnswer: ""
    }))
  };

  quiz.attempts.push(attempt);
  await quiz.save();

  return res
    .status(200)
    .json(new ApiResponse(
      200,
      {
        attemptId: attempt._id,
        questions: preparedQuestions,
        duration: quiz.duration,
        startedAt: attempt.startedAt
      },
      "Quiz attempt started successfully"
    ));
});

const submitQuizAttempt = asyncHandler(async (req, res) => {
  const { quizId, attemptId } = req.params;
  const { responses } = req.body;

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw new ApiError(404, "Quiz not found");
  }

  const attempt = quiz.attempts.id(attemptId);
  if (!attempt) {
    throw new ApiError(404, "Attempt not found");
  }

  // Verify attempt belongs to user
  if (attempt.student.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to submit this attempt");
  }

  // Check if attempt is still valid
  if (attempt.status !== "IN_PROGRESS") {
    throw new ApiError(400, "This attempt has already been submitted");
  }

  const timeTaken = (new Date() - attempt.startedAt) / (1000 * 60); // in minutes
  if (quiz.settings.isTimeLimited && timeTaken > quiz.duration) {
    attempt.status = "EXPIRED";
    await quiz.save();
    throw new ApiError(400, "Quiz time limit exceeded");
  }

  // Update responses
  responses.forEach(response => {
    const existingResponse = attempt.responses.find(
      r => r.question.toString() === response.question
    );
    if (existingResponse) {
      existingResponse.selectedOptions = response.selectedOptions || [];
      existingResponse.textAnswer = response.textAnswer || "";
    }
  });

  // Evaluate attempt
  const evaluatedAttempt = await quiz.evaluateAttempt(attemptId);
  
  if (!evaluatedAttempt) {
    throw new ApiError(500, "Error evaluating quiz attempt");
  }

   // Prepare response based on quiz settings
   const response = {
    attemptId: evaluatedAttempt._id,
    totalMarks: quiz.totalMarks,
    marksObtained: evaluatedAttempt.marksObtained,
    percentage: evaluatedAttempt.percentage,
    timeTaken: timeTaken.toFixed(2),
    status: evaluatedAttempt.status,
    passing: evaluatedAttempt.percentage >= quiz.passingPercentage
  };

  // Add detailed results if settings allow
  if (quiz.settings.showResults) {
    response.detailedResults = evaluatedAttempt.responses.map(res => {
      const question = quiz.questions.id(res.question);
      return {
        question: question.questionText,
        isCorrect: res.isCorrect,
        marksObtained: res.marksObtained,
        maxMarks: question.marks,
        ...(quiz.settings.showAnswers && {
          correctAnswer: question.questionType === 'SHORT_ANSWER' ? 
            question.correctAnswer : 
            question.options.filter(opt => opt.isCorrect),
          explanation: question.explanation
        })
      };
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Quiz submitted successfully"));
});

const updateQuiz = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const updates = req.body;

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw new ApiError(404, "Quiz not found");
  }

  // Verify instructor access
  if (quiz.createdBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to modify this quiz");
  }

  // Don't allow updates if quiz has attempts
  if (quiz.attempts.length > 0 && 
    (updates.questions || updates.duration || updates.totalMarks)) {
    throw new ApiError(
      400, 
      "Cannot modify questions or settings after quiz has been attempted"
    );
  }

  // Update quiz
  Object.assign(quiz, updates);
  await quiz.save();

  return res
    .status(200)
    .json(new ApiResponse(200, quiz, "Quiz updated successfully"));
});

const publishQuiz = asyncHandler(async (req, res) => {
  const { quizId } = req.params;

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw new ApiError(404, "Quiz not found");
  }

  // Verify instructor access
  if (quiz.createdBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to publish this quiz");
  }

  // Validate quiz before publishing
  if (quiz.questions.length === 0) {
    throw new ApiError(400, "Cannot publish quiz without questions");
  }

  quiz.isPublished = true;
  await quiz.save();

  return res
    .status(200)
    .json(new ApiResponse(200, quiz, "Quiz published successfully"));
});

const getQuizById = asyncHandler(async (req, res) => {
  const { quizId } = req.params;

  const quiz = await Quiz.findById(quizId)
    .populate('createdBy', 'fullName userName');

  if (!quiz) {
    throw new ApiError(404, "Quiz not found");
  }

  // If user is not the creator, remove sensitive data
  if (quiz.createdBy._id.toString() !== req.user._id.toString()) {
    quiz.questions.forEach(question => {
      question.options = question.options.map(opt => ({
        _id: opt._id,
        text: opt.text
      }));
      delete question.correctAnswer;
      delete question.explanation;
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, quiz, "Quiz fetched successfully"));
});

const getQuizAttempts = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw new ApiError(404, "Quiz not found");
  }

  // Filter attempts based on user role
  const isInstructor = quiz.createdBy.toString() === req.user._id.toString();
  let attempts = isInstructor ? 
    quiz.attempts : 
    quiz.attempts.filter(a => a.student.toString() === req.user._id.toString());

  // Paginate attempts
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = attempts.length;

  attempts = attempts.slice(startIndex, endIndex);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          attempts,
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        },
        "Quiz attempts fetched successfully"
      )
    );
});

const getQuizStatistics = asyncHandler(async (req, res) => {
  const { quizId } = req.params;

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw new ApiError(404, "Quiz not found");
  }

  // Verify instructor access
  if (quiz.createdBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to view quiz statistics");
  }

  const completedAttempts = quiz.attempts.filter(a => a.status === "COMPLETED");

  const statistics = {
    totalAttempts: quiz.attempts.length,
    completedAttempts: completedAttempts.length,
    averageScore: quiz.averageScore,
    highestScore: Math.max(...completedAttempts.map(a => a.percentage), 0),
    lowestScore: Math.min(...completedAttempts.map(a => a.percentage), 0),
    passingRate: completedAttempts.length ? 
      (completedAttempts.filter(a => a.percentage >= quiz.passingPercentage).length / 
        completedAttempts.length * 100).toFixed(2) : 0,
    questionStats: quiz.questions.map(q => {
      const questionAttempts = completedAttempts.map(a => 
        a.responses.find(r => r.question.toString() === q._id.toString())
      ).filter(Boolean);

      return {
        questionId: q._id,
        text: q.questionText,
        correctAttempts: questionAttempts.filter(r => r.isCorrect).length,
        totalAttempts: questionAttempts.length,
        successRate: questionAttempts.length ? 
          (questionAttempts.filter(r => r.isCorrect).length / 
            questionAttempts.length * 100).toFixed(2) : 0
      };
    })
  };

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        statistics,
        "Quiz statistics fetched successfully"
      )
    );
});

// Helper function to shuffle array
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export {
  createQuiz,
  addQuestion,
  startQuizAttempt,
  submitQuizAttempt,
  updateQuiz,
  publishQuiz,
  getQuizById,
  getQuizAttempts,
  getQuizStatistics
};