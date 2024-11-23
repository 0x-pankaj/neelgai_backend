import cron from "node-cron";
import { analyticsService } from "../services/analytics.service.js";

// Run platform analytics update daily at midnight
cron.schedule("0 0 * * *", async () => {
  try {
    await analyticsService.updatePlatformMetrics();
    console.log("Platform analytics updated successfully");
  } catch (error) {
    console.error("Error updating platform analytics:", error);
  }
});

// Run user analytics update every 6 hours
cron.schedule("0 */6 * * *", async () => {
  try {
    const users = await User.find().select('_id');
    for (const user of users) {
      await analyticsService.updateUserAnalytics(user._id);
    }
    console.log("User analytics updated successfully");
  } catch (error) {
    console.error("Error updating user analytics:", error);
  }
});

// Run course analytics update every 12 hours
cron.schedule("0 */12 * * *", async () => {
    try {
      const courses = await Course.find().select('_id');
      for (const course of courses) {
        await analyticsService.updateCourseAnalytics(course._id);
      }
      console.log("Course analytics updated successfully");
    } catch (error) {
      console.error("Error updating course analytics:", error);
    }
  });
  
  // Run instructor analytics update daily at 1 AM
  cron.schedule("0 1 * * *", async () => {
    try {
      const instructors = await User.find({ role: "INSTRUCTOR" }).select('_id');
      for (const instructor of instructors) {
        await analyticsService.updateInstructorAnalytics(instructor._id);
      }
      console.log("Instructor analytics updated successfully");
    } catch (error) {
      console.error("Error updating instructor analytics:", error);
    }
  });