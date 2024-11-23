# Neelgai EdTech Platform Backend

A comprehensive EdTech platform backend built with Node.js, Express, and MongoDB. This platform provides a robust system for online learning, course management, and student progress tracking.

## 🚀 Features

### 👥 User Management
- Multi-role authentication (Student, Instructor, Admin)
- JWT-based authentication with refresh tokens
- Profile management with avatar upload
- Password reset and email verification
- Session management

### 📚 Course Management
- Complete course CRUD operations
- Module and lecture organization
- Rich content support
- Course enrollment system
- Progress tracking
- Rating and review system

### 📝 Quiz System
- Multiple question types support
- Timed assessments
- Automated grading
- Performance analytics
- Progress tracking
- Retry policies

### 📊 Progress Tracking
- Detailed course progress monitoring
- Learning path tracking
- Achievement system
- Study streak monitoring
- Certification generation
- Performance analytics

### 📝 Notes System
- Personal note-taking
- Note sharing capabilities
- Rich text support
- Categorization with tags
- Search functionality
- Attachment support

### 💬 Discussion Forum
- Course-specific discussions
- Thread categorization
- Comment system with nested replies
- Upvoting/downvoting
- Moderation tools
- Notification system

### 📈 Analytics Dashboard
- User engagement metrics
- Course performance statistics
- Learning progress analytics
- Instructor insights
- Platform-wide statistics
- Revenue tracking

## 🛠 Technology Stack

- **Runtime Environment**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Cloudinary
- **Email Service**: (Configurable - NodeMailer)
- **Development**: ESM Modules

## 📁 Project Structure

```
src/
├── controllers/      # Route controllers
│   ├── auth.controller.js
│   ├── course.controller.js
│   ├── quiz.controller.js
│   ├── progress.controller.js
│   ├── note.controller.js
│   ├── discussion.controller.js
│   └── analytics.controller.js
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

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- MongoDB 4.4+
- Cloudinary account
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

### Environment Variables

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
```

## 📚 API Documentation

### Authentication Endpoints
```javascript
POST /api/v1/auth/register  # Register new user
POST /api/v1/auth/login     # Login user
POST /api/v1/auth/logout    # Logout user
POST /api/v1/auth/refresh   # Refresh access token
```

### Course Endpoints
```javascript
GET    /api/v1/courses              # List all courses
POST   /api/v1/courses              # Create course
GET    /api/v1/courses/:id          # Get course details
PATCH  /api/v1/courses/:id          # Update course
DELETE /api/v1/courses/:id          # Delete course
```

### Quiz Endpoints
```javascript
POST   /api/v1/quizzes             # Create quiz
GET    /api/v1/quizzes/:id         # Get quiz
POST   /api/v1/quizzes/:id/attempt # Submit quiz attempt
GET    /api/v1/quizzes/:id/results # Get quiz results
```

### Progress Tracking
```javascript
GET    /api/v1/progress                # Get user progress
POST   /api/v1/progress/track          # Update progress
GET    /api/v1/progress/certificate    # Generate certificate
```

### Discussion Forum
```javascript
GET    /api/v1/discussions            # List discussions
POST   /api/v1/discussions            # Create discussion
POST   /api/v1/discussions/:id/reply  # Reply to discussion
```

### Analytics
```javascript
GET    /api/v1/analytics/dashboard    # Get dashboard stats
GET    /api/v1/analytics/course/:id   # Get course analytics
GET    /api/v1/analytics/user/:id     # Get user analytics
```

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- File upload security
- Rate limiting

## 🚦 System Validation

Run the system validation to check all components:

```bash
npm run validate
```

This will check:
- Database connectivity
- Model integrity
- Core functionalities
- File upload system
- Email system

## 📝 API Response Format

### Success Response
```json
{
  "statusCode": 200,
  "data": {},
  "message": "Success message",
  "success": true
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Error message",
  "errors": [],
  "success": false
}
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details

## 👥 Authors

- Lead Developer: 
- Team: 

## 🙏 Acknowledgements

- Express.js team
- MongoDB team
- Cloudinary
- All contributors