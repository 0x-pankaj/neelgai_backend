import mongoose from "mongoose";

const lectureSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  videoUrl: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  resources: [{
    title: String,
    fileUrl: String,
    type: {
      type: String,
      enum: ['PDF', 'DOCUMENT', 'LINK']
    }
  }],
  order: {
    type: Number,
    required: true
  }
}, { timestamps: true });

const moduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  lectures: [lectureSchema]
}, { timestamps: true });

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    required: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  duration: {
    type: Number, // Total duration in minutes
    required: true
  },
  modules: [moduleSchema],
  category: {
    type: String,
    required: true,
    enum: ['MATH', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'COMPUTER_SCIENCE']
  },
  level: {
    type: String,
    required: true,
    enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']
  },
  tags: [{
    type: String,
    index: true
  }],
  prerequisites: [{
    type: String
  }],
  outcomes: [{
    type: String
  }],
  pricing: {
    isFree: {
      type: Boolean,
      default: false
    },
    price: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'NPR'
    }
  },
  enrolledStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    completedLectures: [{
      type: mongoose.Schema.Types.ObjectId
    }]
  }],
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    review: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: Date,
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for searching
courseSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text' 
});

// Pre-save hook to update lastUpdated
courseSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Method to calculate average rating
courseSchema.methods.calculateAverageRating = async function() {
  const reviews = this.reviews;
  if (reviews.length === 0) {
    this.ratings.average = 0;
    this.ratings.count = 0;
  } else {
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    this.ratings.average = (total / reviews.length).toFixed(1);
    this.ratings.count = reviews.length;
  }
  await this.save();
};

// Virtual for completion percentage
courseSchema.virtual('completionPercentage').get(function() {
  const totalLectures = this.modules.reduce(
    (sum, module) => sum + module.lectures.length, 
    0
  );
  return totalLectures === 0 ? 0 : 
    (this.enrolledStudents[0]?.completedLectures.length / totalLectures * 100).toFixed(1);
});

export const Course = mongoose.model('Course', courseSchema);