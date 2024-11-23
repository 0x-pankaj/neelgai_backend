import { Course } from "../../models/course.model.js";
import { Progress } from "../../models/progress.model.js";
import { Quiz } from "../../models/quiz.model.js";
import { User } from "../../models/user.model.js";
import { Discussion } from "../../models/discussion.model.js";
import { Note } from "../../models/notes.model.js";

const createIndexSafely = async (collection, index, options = {}) => {
    try {
        // First, try to drop any existing index with the same name
        try {
            await collection.dropIndex(options.name || Object.keys(index).join('_'));
        } catch (error) {
            // Ignore error if index doesn't exist
        }

        // Create the new index
        await collection.createIndex(index, options);
        console.log(`Successfully created index for ${collection.collectionName}: ${JSON.stringify(index)}`);
    } catch (error) {
        console.warn(`Warning: Could not create index for ${collection.collectionName}: ${error.message}`);
    }
};

const migration = async () => {
    try {
        console.log('Creating indexes...');

        // User indexes
        await createIndexSafely(User.collection, { email: 1 }, { unique: true });
        await createIndexSafely(User.collection, { userName: 1 }, { unique: true });
        await createIndexSafely(User.collection, { role: 1 });
        await createIndexSafely(User.collection, { lastActive: -1 });

        // Course indexes
        await createIndexSafely(Course.collection, { instructor: 1 });
        await createIndexSafely(Course.collection, 
            { title: 'text', description: 'text', tags: 'text' },
            { name: 'course_text_search' }
        );
        await createIndexSafely(Course.collection, { 'enrolledStudents.student': 1 });
        await createIndexSafely(Course.collection, { isPublished: 1 });
        await createIndexSafely(Course.collection, { category: 1 });
        await createIndexSafely(Course.collection, { level: 1 });

        // Progress indexes
        await createIndexSafely(Progress.collection, 
            { student: 1, course: 1 }, 
            { 
                name: 'progress_student_course',
                unique: true 
            }
        );
        await createIndexSafely(Progress.collection, { lastAccessedAt: -1 });
        await createIndexSafely(Progress.collection, { status: 1 });
        await createIndexSafely(Progress.collection, { 'moduleProgress.completionStatus': 1 });
        await createIndexSafely(Progress.collection, { enrolledAt: -1 });

        // Quiz indexes
        await createIndexSafely(Quiz.collection, { course: 1, module: 1 });
        await createIndexSafely(Quiz.collection, 
            { course: 1, endDate: 1, isPublished: 1 },
            { name: 'quiz_course_date_status' }
        );
        await createIndexSafely(Quiz.collection, { 'attempts.student': 1 });
        await createIndexSafely(Quiz.collection, { startDate: 1, endDate: 1 });
        await createIndexSafely(Quiz.collection, { passingPercentage: 1 });

        // Discussion indexes
        await createIndexSafely(Discussion.collection, { course: 1, module: 1 });
        await createIndexSafely(Discussion.collection, { author: 1 });
        await createIndexSafely(Discussion.collection, { 'comments.author': 1 });
        await createIndexSafely(Discussion.collection, 
            { title: 'text', content: 'text', tags: 'text' },
            { name: 'discussion_text_search' }
        );
        await createIndexSafely(Discussion.collection, { category: 1 });
        await createIndexSafely(Discussion.collection, { isResolved: 1 });

        // Note indexes
        await createIndexSafely(Note.collection, { student: 1, course: 1 });
        await createIndexSafely(Note.collection, { 'sharedWith.user': 1 });
        await createIndexSafely(Note.collection, 
            { title: 'text', content: 'text', 'tags.name': 'text' },
            { name: 'note_text_search' }
        );
        await createIndexSafely(Note.collection, { isPinned: 1 });
        await createIndexSafely(Note.collection, { isArchived: 1 });

        console.log('All indexes created successfully');
    } catch (error) {
        console.error('Error in migration:', error);
        throw error;
    }
};

export default migration;