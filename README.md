# Neelgai EdTech Platform Backend

A comprehensive EdTech platform backend built with Node.js, Express, and MongoDB. This platform provides a robust system for online learning, course management, and student progress tracking.

## 🚀 Features

### 👥 User Management
- Multi-role authentication (Student, Instructor, Admin)
- JWT-based authentication with refresh tokens
- Profile management with avatar and cover image upload
- Password reset and email verification
- Session management
- User preferences and settings
- Course enrollment system
- Study progress tracking

### 📚 Course Management
- Complete course CRUD operations
- Module and lecture organization
- Rich content support with video uploads
- Course enrollment system
- Progress tracking
- Rating and review system
- Resource attachments
- Course publishing workflow
- Student enrollment tracking
- Instructor analytics

### 📝 Quiz System
- Multiple question types support
- Timed assessments
- Quiz attempts tracking
- Automated grading
- Performance analytics
- Progress tracking
- Retry policies
- Quiz statistics
- Publishing workflow

### 📊 Progress Tracking
- Detailed course progress monitoring
- Module-level progress tracking
- Learning path visualization
- Achievement system
- Study streak monitoring
- Certification generation
- Performance analytics
- Student overview dashboard

### 📝 Notes System
- Personal note-taking
- Note sharing capabilities
- Rich text support
- Categorization with tags
- Search functionality
- Attachment support (up to 5 files)
- Pin/Favorite/Archive features
- Reminders
- Notes overview dashboard

### 💬 Discussion Forum
- Course-specific discussions
- Thread categorization
- Comment system with nested replies
- File attachments support
- Upvoting/downvoting
- Discussion following
- Resolution marking
- Discussion statistics
- Moderation tools

### 📈 Analytics Dashboard
- Platform-wide analytics
- User engagement metrics
- Course performance statistics
- Learning progress analytics
- Instructor insights
- Student performance tracking
- Revenue analytics
- Notification statistics

### 🔔 Notification System
- Real-time notifications
- Customizable preferences
- Bulk notification sending
- Read/Unread tracking
- Notification statistics
- Email integration

## 🛠 Technology Stack

- **Runtime Environment**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Cloudinary
- **Email Service**: NodeMailer
- **Development**: ESM Modules

## 📁 Project Structure

```
src/
├── controllers/      # Route controllers
│   ├── analytics.controller.js
│   ├── auth.controller.js
│   ├── course.controller.js
│   ├── dashboard.controller.js
│   ├── discussion.controller.js
│   ├── notes.controller.js
│   ├── notification.controller.js
│   ├── progress.controller.js
│   ├── quiz.controller.js
│   └── user.controller.js
├── models/          # Database models
│   ├── user.model.js
│   ├── course.model.js
│   ├── quiz.model.js
│   ├── progress.model.js
│   ├── note.model.js
│   └── discussion.model.js
├── routes/          # API routes
│   ├── auth.routes.js
│   ├── course.routes.js
│   ├── quiz.routes.js
│   └── ...
├── middleware/      # Custom middleware
│   ├── auth.middleware.js
│   ├── multer.middleware.js
│   └── error.middleware.js
├── utils/          # Utility functions
│   ├── ApiError.js
│   ├── ApiResponse.js
│   ├── asyncHandler.js
│   └── cloudinary.js
├── db/             # Database configuration
│   ├── index.js
│   └── migrations/
├── constants/      # Constants and enums
└── app.js         # App entry point
```

## 📚 API Documentation

### User Routes
```javascript
// Public routes
POST   /api/v1/users/register          # Register new user
POST   /api/v1/users/login             # Login user
POST   /api/v1/users/refresh-token     # Refresh access token

// Protected routes
POST   /api/v1/users/logout            # Logout user
POST   /api/v1/users/change-password   # Change password
GET    /api/v1/users/current-user      # Get current user
PATCH  /api/v1/users/update-account    # Update account details
PATCH  /api/v1/users/avatar            # Update avatar
PATCH  /api/v1/users/cover-image       # Update cover image
POST   /api/v1/users/enroll            # Enroll in course
PATCH  /api/v1/users/preferences       # Update preferences
GET    /api/v1/users/enrolled-courses  # Get enrolled courses
GET    /api/v1/users/profile/:username # Get user profile
GET    /api/v1/users/study-progress    # Get study progress
```

### Course Routes
```javascript
// Public routes
GET    /api/v1/courses                # List all courses
GET    /api/v1/courses/:id            # Get course details

// Student routes
POST   /api/v1/courses/:id/review     # Add course review
GET    /api/v1/courses/:id/progress   # Get course progress
POST   /api/v1/courses/:id/complete   # Mark lecture complete

// Instructor routes
POST   /api/v1/courses                # Create course
GET    /api/v1/courses/instructor     # Get instructor courses
PATCH  /api/v1/courses/:id            # Update course
PATCH  /api/v1/courses/:id/publish    # Publish course
POST   /api/v1/courses/:id/modules    # Add module
POST   /api/v1/courses/:id/lectures   # Add lecture
POST   /api/v1/courses/:id/resources  # Add resources
GET    /api/v1/courses/:id/students   # Get enrolled students
```

### Quiz Routes
```javascript
// Student routes
GET    /api/v1/quizzes/:id           # Get quiz
POST   /api/v1/quizzes/:id/attempt   # Start quiz attempt
POST   /api/v1/quizzes/:id/submit    # Submit attempt
GET    /api/v1/quizzes/:id/attempts  # Get attempts

// Instructor routes
POST   /api/v1/quizzes               # Create quiz
PATCH  /api/v1/quizzes/:id           # Update quiz
POST   /api/v1/quizzes/:id/questions # Add question
PATCH  /api/v1/quizzes/:id/publish   # Publish quiz
GET    /api/v1/quizzes/:id/stats     # Get statistics
```

### Progress Routes
```javascript
GET    /api/v1/progress/overview           # Get progress overview
POST   /api/v1/progress/:courseId         # Initialize progress
GET    /api/v1/progress/:courseId         # Get course progress
GET    /api/v1/progress/:courseId/module  # Get module progress
POST   /api/v1/progress/:courseId/lecture # Update lecture progress
POST   /api/v1/progress/:courseId/quiz    # Update quiz progress
POST   /api/v1/progress/:courseId/cert    # Generate certificate
```

### Notes Routes
```javascript
GET    /api/v1/notes/overview      # Get notes overview
GET    /api/v1/notes               # List notes
POST   /api/v1/notes               # Create note
GET    /api/v1/notes/:id           # Get note
PATCH  /api/v1/notes/:id           # Update note
DELETE /api/v1/notes/:id           # Delete note
POST   /api/v1/notes/:id/share     # Share note
PATCH  /api/v1/notes/:id/pin       # Toggle pin
PATCH  /api/v1/notes/:id/favorite  # Toggle favorite
PATCH  /api/v1/notes/:id/archive   # Archive note
```

### Discussion Routes
```javascript
GET    /api/v1/discussions              # List discussions
POST   /api/v1/discussions              # Create discussion
GET    /api/v1/discussions/:id          # Get discussion
PATCH  /api/v1/discussions/:id          # Update discussion
POST   /api/v1/discussions/:id/comment  # Add comment
POST   /api/v1/discussions/:id/vote     # Vote discussion
POST   /api/v1/discussions/:id/follow   # Follow discussion
PATCH  /api/v1/discussions/:id/resolve  # Mark resolved
```

### Analytics Routes
```javascript
GET    /api/v1/analytics/platform      # Platform analytics
GET    /api/v1/analytics/users/:id     # User analytics
GET    /api/v1/analytics/courses/:id   # Course analytics
GET    /api/v1/analytics/instructors   # Instructor analytics
```

### Dashboard Routes
```javascript
GET    /api/v1/dashboard/admin      # Admin dashboard
GET    /api/v1/dashboard/instructor # Instructor dashboard
GET    /api/v1/dashboard/student    # Student dashboard
```

### Notification Routes
```javascript
GET    /api/v1/notifications           # Get notifications
GET    /api/v1/notifications/unread    # Get unread count
PATCH  /api/v1/notifications/:id/read  # Mark as read
PATCH  /api/v1/notifications/read-all  # Mark all read
GET    /api/v1/notifications/prefs     # Get preferences
PATCH  /api/v1/notifications/prefs     # Update preferences
```

## 🔐 Security Features

- JWT-based authentication with refresh tokens
- Role-based access control (Student, Instructor, Admin)
- Password hashing with bcrypt
- Input validation and sanitization
- File upload security with size and type validation
- Rate limiting
- CORS protection
- XSS prevention
- Request validation

## 🚦 Environment Variables

```env
PORT=8000
MONGODB_URI=your_mongodb_uri
DB_NAME=your_db_name

# Auth
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=10d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email
SMTP_HOST=your_smtp_host
SMTP_PORT=your_smtp_port
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- MongoDB 4.4+
- Cloudinary account
- SMTP server access
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd neelgai-backend
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configurations
```

4. Start the development server
```bash
npm run dev
```

## 📝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.