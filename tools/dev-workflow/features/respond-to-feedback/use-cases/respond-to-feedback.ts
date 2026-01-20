import { github } from '../../../platform/infra/external-clients/github-rest-client'
import {
  respondToFeedbackInputSchema,
  formatReplyBody,
  type RespondToFeedbackInput,
  type RespondToFeedbackOutput,
} from '../domain/feedback-response'

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
