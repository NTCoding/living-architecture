import { github } from '../../../platform/infra/external-clients/github-rest-client'
import { WorkflowError } from '../../../platform/domain/workflow-execution/workflow-runner'
import {
  respondToFeedbackInputSchema,
  formatReplyBody,
  type RespondToFeedbackInput,
  type RespondToFeedbackOutput,
} from '../domain/feedback-response'

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

export async function respondToFeedback(
  args: RespondToFeedbackInput,
): Promise<RespondToFeedbackOutput> {
  const input = respondToFeedbackInputSchema.parse(args)

  await github.addThreadReply(input.threadId, formatReplyBody(input.action, input.message))
  await github.resolveThread(input.threadId)

  return {
    success: true,
    threadId: input.threadId,
    action: input.action,
  }
}

export function executeRespondToFeedback(): void {
  const args = parseArgs()
  respondToFeedback({
    threadId: args.threadId,
    action: validateAction(args.action),
    message: args.message,
  })
    .then((output) => {
      console.log(JSON.stringify(output, null, 2))
    })
    .catch((error: unknown) => {
      console.error('Error:', error instanceof Error ? error.message : String(error))
      process.exit(1)
    })
}
