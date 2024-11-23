// src/models/video.model.js
import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new mongoose.Schema(
    {
        videoFile: {
            type: String, // Cloudinary URL
            required: [true, "Video file is required"]
        },
        thumbnail: {
            type: String, // Cloudinary URL
            required: [true, "Thumbnail is required"]
        },
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            index: true
        },
        description: {
            type: String,
            required: [true, "Description is required"],
            trim: true
        },
        duration: {
            type: Number, // in seconds
            required: [true, "Duration is required"]
        },
        subject: {
            type: String,
            required: [true, "Subject is required"],
            index: true
        },
        topic: {
            type: String,
            required: false,
            index: true
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        views: {
            type: Number,
            default: 0
        },
        isPublished: {
            type: Boolean,
            default: false
        },
        cloudinaryVideoId: {
            type: String,
            required: true
        },
        cloudinaryThumbnailId: {
            type: String,
            required: true
        },
        tags: [{
            type: String,
            trim: true
        }],
        difficulty: {
            type: String,
            enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
            default: "INTERMEDIATE"
        },
        likes: {
            type: Number,
            default: 0
        },
        watchTime: {
            type: Number, // Total watch time in seconds
            default: 0
        }
    },
    { 
        timestamps: true 
    }
);

// Add text search indexes
videoSchema.index({ 
    title: 'text', 
    description: 'text',
    tags: 'text'
});

// Plugin for pagination
videoSchema.plugin(mongooseAggregatePaginate);

// Method to increment views
videoSchema.methods.incrementViews = async function() {
    this.views += 1;
    return await this.save();
};

// Method to update watch time
videoSchema.methods.updateWatchTime = async function(timeInSeconds) {
    this.watchTime += timeInSeconds;
    return await this.save();
};

// Virtual for formatted duration
videoSchema.virtual('durationFormatted').get(function() {
    const minutes = Math.floor(this.duration / 60);
    const seconds = this.duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

export const Video = mongoose.model("Video", videoSchema);