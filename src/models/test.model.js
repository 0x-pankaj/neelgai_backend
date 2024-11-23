import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true, "Question text is required"]
    },
    options: [{
        text: {
            type: String,
            required: true
        },
        isCorrect: {
            type: Boolean,
            required: true
        }
    }],
    explanation: {
        type: String,
        required: false
    },
    marks: {
        type: Number,
        default: 1
    }
}, { timestamps: true });

const testSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Test title is required"],
        trim: true
    },
    description: {
        type: String,
        required: false
    },
    subject: {
        type: String,
        required: [true, "Subject is required"],
        index: true
    },
    duration: {
        type: Number, // in minutes
        required: [true, "Test duration is required"]
    },
    questions: [questionSchema],
    difficulty: {
        type: String,
        enum: ["EASY", "MEDIUM", "HARD"],
        default: "MEDIUM"
    },
    totalMarks: {
        type: Number,
        required: true
    },
    passingPercentage: {
        type: Number,
        default: 40
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
}, { timestamps: true });

export const Test = mongoose.model("Test", testSchema);