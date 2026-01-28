import { z } from 'zod'
import { github } from '../../../platform/infra/external-clients/github-rest-client'
import {
  respondToFeedbackInputSchema,
  responseActionSchema,
  formatReplyBody,
  type RespondToFeedbackInput,
  type RespondToFeedbackOutput,
} from '../domain/feedback-response'

const cliArgsSchema = z.object({
  threadId: z.string().min(1, { message: '--thread-id is required' }),
  action: z.string().min(1, { message: '--action is required (fixed or rejected)' }),
  message: z.string().min(1, { message: '--message is required' }),
})

function parseArgs(): z.infer<typeof cliArgsSchema> {
  const threadIdIndex = process.argv.indexOf('--thread-id')
  const actionIndex = process.argv.indexOf('--action')
  const messageIndex = process.argv.indexOf('--message')

  const rawArgs = {
    threadId: threadIdIndex >= 0 ? process.argv[threadIdIndex + 1] : undefined,
    action: actionIndex >= 0 ? process.argv[actionIndex + 1] : undefined,
    message: messageIndex >= 0 ? process.argv[messageIndex + 1] : undefined,
  }

  return cliArgsSchema.parse(rawArgs)
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

export async function executeRespondToFeedback(): Promise<void> {
  const args = parseArgs()
  const action = responseActionSchema.parse(args.action)
  const output = await respondToFeedback({
    threadId: args.threadId,
    action,
    message: args.message,
  })
  console.log(JSON.stringify(output, null, 2))
}
