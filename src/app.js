import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "20kb",
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "20kb",
  })
);
app.use(express.static("public"));


//routers import
import userRouter from './routes/user.route.js';
import healthCheckRouter  from "./routes/healthcheck.route.js";
import courseRouter from "./routes/course.route.js"
import quizRouter from "./routes/quiz.route.js";
import progressRouter from "./routes/progress.route.js";
import notesRouter from "./routes/notes.route.js";
import discussionRouter from "./routes/discussion.route.js";
import analyticsRouter from "./routes/analytics.route.js";
import dashboardRouter from "./routes/dashboard.route.js";
// import notificationRouter from "./routes/notification.route.js";

//routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/course", courseRouter);
app.use("/api/v1/quiz", quizRouter);
app.use("/api/v1/progress", progressRouter);
app.use("/api/v1/notes", notesRouter);
app.use("/api/v1/discussion", discussionRouter);
app.use("/api/v1/analytics", analyticsRouter);
app.use("/api/v1/dashboard", dashboardRouter);
// app.use("/api/v1/notification", notificationRouter);

app.use("/api/v1/health-check", healthCheckRouter)

export { app };