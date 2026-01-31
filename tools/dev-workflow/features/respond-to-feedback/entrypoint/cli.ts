#!/usr/bin/env tsx
import { executeRespondToFeedback } from '../commands/respond-to-feedback'

executeRespondToFeedback().catch((error: unknown) => {
  console.error('Error:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
