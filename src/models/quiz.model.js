import mongoose from "mongoose";

const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  isCorrect: {
    type: Boolean,
    required: true,
    default: false 
  },
  explanation: {
    type: String,
    trim: true
  }
});

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  questionType: {
    type: String,
    required: true,
    enum: ["MULTIPLE_CHOICE", "SINGLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER"],
  },
  options: [optionSchema],
  correctAnswer: {
    type: String,
    required: function() {
      return this.questionType === "SHORT_ANSWER";
    }
  },
  marks: {
    type: Number,
    required: true,
    default: 1
  },
  explanation: {
    type: String,
    trim: true
  },
  difficultyLevel: {
    type: String,
    enum: ["EASY", "MEDIUM", "HARD"],
    default: "MEDIUM"
  }
}, { timestamps: true });

const studentResponseSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  selectedOptions: [{
    type: mongoose.Schema.Types.ObjectId
  }],
  textAnswer: {
    type: String,
    trim: true
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  marksObtained: {
    type: Number,
    default: 0
  }
});

const quizAttemptSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  responses: [studentResponseSchema],
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date
  },
  totalMarks: {
    type: Number,
    default: 0
  },
  marksObtained: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ["IN_PROGRESS", "COMPLETED", "EXPIRED"],
    default: "IN_PROGRESS"
  }
}, { timestamps: true });

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },
  module: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  instructions: [{
    type: String,
    trim: true
  }],
  duration: {
    type: Number, // in minutes
    required: true,
    min: 1
  },
  totalMarks: {
    type: Number,
    required: true
  },
  passingPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 50
  },
  questions: [questionSchema],
  attempts: [quizAttemptSchema],
  settings: {
    shuffleQuestions: {
      type: Boolean,
      default: true
    },
    shuffleOptions: {
      type: Boolean,
      default: true
    },
    showAnswers: {
      type: Boolean,
      default: true
    },
    showResults: {
      type: Boolean,
      default: true
    },
    maxAttempts: {
      type: Number,
      default: 1
    },
    isTimeLimited: {
      type: Boolean,
      default: true
    }
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
quizSchema.virtual('attemptCount').get(function() {
  return this.attempts.length;
});

quizSchema.virtual('averageScore').get(function() {
  if (this.attempts.length === 0) return 0;
  const totalScore = this.attempts.reduce((sum, attempt) => sum + attempt.percentage, 0);
  return (totalScore / this.attempts.length).toFixed(2);
});

// Methods
quizSchema.methods.calculateTotalMarks = function() {
  this.totalMarks = this.questions.reduce((sum, question) => sum + question.marks, 0);
};

quizSchema.methods.evaluateAttempt = async function(attemptId) {
  const attempt = this.attempts.id(attemptId);
  if (!attempt) return null;

  let totalMarksObtained = 0;

  attempt.responses.forEach(response => {
    const question = this.questions.id(response.question);
    if (!question) return;

    switch (question.questionType) {
      case "MULTIPLE_CHOICE":
      case "SINGLE_CHOICE":
        const correctOptionIds = question.options
          .filter(opt => opt.isCorrect)
          .map(opt => opt._id.toString());
        
        const selectedOptionIds = response.selectedOptions
          .map(opt => opt.toString());

        const isCorrect = 
          correctOptionIds.length === selectedOptionIds.length &&
          correctOptionIds.every(id => selectedOptionIds.includes(id));

        response.isCorrect = isCorrect;
        response.marksObtained = isCorrect ? question.marks : 0;
        break;

      case "TRUE_FALSE":
        const correctOption = question.options.find(opt => opt.isCorrect);
        response.isCorrect = 
          response.selectedOptions[0]?.toString() === correctOption._id.toString();
        response.marksObtained = response.isCorrect ? question.marks : 0;
        break;

      case "SHORT_ANSWER":
        // Basic string comparison - could be enhanced with more sophisticated matching
        response.isCorrect = 
          response.textAnswer?.toLowerCase().trim() === 
          question.correctAnswer.toLowerCase().trim();
        response.marksObtained = response.isCorrect ? question.marks : 0;
        break;
    }

    totalMarksObtained += response.marksObtained;
  });

  attempt.marksObtained = totalMarksObtained;
  attempt.percentage = (totalMarksObtained / this.totalMarks * 100).toFixed(2);
  attempt.status = "COMPLETED";
  attempt.submittedAt = new Date();

  await this.save();
  return attempt;
};

// Indexes
quizSchema.index({ "course": 1, "module": 1 });
quizSchema.index({ "title": "text", "description": "text" });

export const Quiz = mongoose.model("Quiz", quizSchema);