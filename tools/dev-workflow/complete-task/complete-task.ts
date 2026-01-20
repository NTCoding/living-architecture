#!/usr/bin/env tsx
// Re-export from new location - will be removed after full restructure
export {
  completeTaskContextSchema,
  type CompleteTaskContext,
} from '../features/complete-task/domain/task-to-complete'

// Import and run the new entry point
import '../features/complete-task/entrypoint/cli'
