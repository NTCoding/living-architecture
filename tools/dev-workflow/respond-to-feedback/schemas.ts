import { z } from 'zod'

const responseActionSchema = z.enum(['fixed', 'rejected'])

export const respondToFeedbackInputSchema = z.object({
  threadId: z.string().min(1, { error: 'threadId is required' }),
  action: responseActionSchema,
  message: z.string().min(1, { error: 'message is required' }),
})

const respondToFeedbackOutputSchema = z.object({
  success: z.boolean(),
  threadId: z.string(),
  action: responseActionSchema,
  error: z.string().optional(),
})
export type RespondToFeedbackOutput = z.infer<typeof respondToFeedbackOutputSchema>
