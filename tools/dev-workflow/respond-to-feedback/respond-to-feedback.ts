#!/usr/bin/env tsx
import { github } from '../external-clients/github'
import { WorkflowError } from '../errors'
import {
  respondToFeedbackInputSchema, type RespondToFeedbackOutput 
} from './schemas'

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

function formatReplyBody(action: string, message: string): string {
  if (action === 'fixed') {
    return `✅ **Fixed**: ${message}`
  }
  return `❌ **Rejected**: ${message}`
}

async function main(): Promise<void> {
  const args = parseArgs()
  const input = respondToFeedbackInputSchema.parse(args)

  await github.addThreadReply(input.threadId, formatReplyBody(input.action, input.message))
  await github.resolveThread(input.threadId)

  const output: RespondToFeedbackOutput = {
    success: true,
    threadId: input.threadId,
    action: input.action,
  }

  console.log(JSON.stringify(output, null, 2))
}

function getActionFromArgs(): 'fixed' | 'rejected' {
  const actionIndex = process.argv.indexOf('--action')
  if (actionIndex === -1) {
    return 'fixed'
  }
  const actionArg = process.argv[actionIndex + 1]
  if (actionArg === 'fixed' || actionArg === 'rejected') {
    return actionArg
  }
  return 'fixed'
}

main().catch((error: unknown) => {
  const threadIdIndex = process.argv.indexOf('--thread-id')
  if (threadIdIndex === -1) {
    console.error('Error: --thread-id is required')
    process.exit(1)
  }

  const threadId = process.argv[threadIdIndex + 1]
  if (!threadId) {
    console.error('Error: --thread-id value is missing')
    process.exit(1)
  }

  const action = getActionFromArgs()

  const output: RespondToFeedbackOutput = {
    success: false,
    threadId,
    action,
    error: error instanceof Error ? error.message : String(error),
  }
  console.error(JSON.stringify(output, null, 2))
  process.exit(1)
})
