#!/usr/bin/env tsx
// Re-export from new location - will be removed after full restructure
export { respondToFeedback } from '../features/respond-to-feedback/use-cases/respond-to-feedback'

import { WorkflowError } from '../errors'
import { respondToFeedback } from '../features/respond-to-feedback/use-cases/respond-to-feedback'

interface ParsedArgs {
  threadId: string
  action: string
  message: string
}

function parseArgs(): ParsedArgs {
  const threadIdIndex = process.argv.indexOf('--thread-id')
  const actionIndex = process.argv.indexOf('--action')
  const messageIndex = process.argv.indexOf('--message')

  if (threadIdIndex === -1 || threadIdIndex + 1 >= process.argv.length) {
    throw new WorkflowError('--thread-id is required')
  }
  if (actionIndex === -1 || actionIndex + 1 >= process.argv.length) {
    throw new WorkflowError('--action is required (fixed or rejected)')
  }
  if (messageIndex === -1 || messageIndex + 1 >= process.argv.length) {
    throw new WorkflowError('--message is required')
  }

  return {
    threadId: process.argv[threadIdIndex + 1],
    action: process.argv[actionIndex + 1],
    message: process.argv[messageIndex + 1],
  }
}

function validateAction(action: string): 'fixed' | 'rejected' {
  if (action === 'fixed' || action === 'rejected') {
    return action
  }
  throw new WorkflowError(`Invalid action: ${action}. Must be 'fixed' or 'rejected'`)
}

async function main(): Promise<void> {
  const args = parseArgs()
  const output = await respondToFeedback({
    threadId: args.threadId,
    action: validateAction(args.action),
    message: args.message,
  })
  console.log(JSON.stringify(output, null, 2))
}

main().catch((error: unknown) => {
  console.error('Error:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
