import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      minlength: [6, "Username must be at least 6 characters"],
      maxlength: [16, "Username cannot exceed 16 characters"],
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
    },
    role: {
      type: String,
      enum: ["STUDENT", "INSTRUCTOR", "ADMIN"],
      default: "STUDENT",
    },
    refreshToken: {
      type: String,
    },
    enrolledCourses: [{
      course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course"
      },
      enrolledAt: {
        type: Date,
        default: Date.now
      }
    }],
    preferences: {
      subjects: [{
        type: String,
        enum: ["MATH", "PHYSICS", "CHEMISTRY", "BIOLOGY", "COMPUTER_SCIENCE"]
      }],
      notificationPreferences: {
        email: {
          type: Boolean,
          default: true
        },
        mobile: {
          type: Boolean,
          default: true
        }
      }
    },
    lastActive: {
      type: Date,
      default: Date.now
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpire: Date
  },
  { 
    timestamps: true 
  }
);

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
  if(!this.isModified("password")) return next();
  
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
userSchema.methods.isPasswordCorrect = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Generate access token
userSchema.methods.generateAccessToken = async function() {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      userName: this.userName,
      role: this.role
    },
    process.env.ACCESS_TOKEN_SECRET,
    {expiresIn: process.env.ACCESS_TOKEN_EXPIRY}
  );
};

// Generate refresh token
userSchema.methods.generateRefreshToken = async function() {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
  );
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = async function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
  
  return resetToken;
};

export const User = mongoose.model("User", userSchema);