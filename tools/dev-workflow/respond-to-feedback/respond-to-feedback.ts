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

main().catch((error: unknown) => {
  console.error('Error:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
