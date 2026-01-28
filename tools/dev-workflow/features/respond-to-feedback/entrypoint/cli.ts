#!/usr/bin/env tsx
import { executeRespondToFeedback } from '../use-cases/respond-to-feedback'

/* v8 ignore start - CLI entry point with process.exit, tested via integration */
executeRespondToFeedback().catch((error: unknown) => {
  console.error('Error:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
/* v8 ignore stop */
