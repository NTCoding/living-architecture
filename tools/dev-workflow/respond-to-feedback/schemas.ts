import { z } from 'zod'

export const responseActionSchema = z.enum(['fixed', 'rejected'])
export type ResponseAction = z.infer<typeof responseActionSchema>

export const respondToFeedbackInputSchema = z.object({
  threadId: z.string().min(1, 'threadId is required'),
  action: responseActionSchema,
  message: z.string().min(1, 'message is required'),
})
export type RespondToFeedbackInput = z.infer<typeof respondToFeedbackInputSchema>

export const respondToFeedbackOutputSchema = z.object({
  success: z.boolean(),
  threadId: z.string(),
  action: responseActionSchema,
  error: z.string().optional(),
})
export type RespondToFeedbackOutput = z.infer<typeof respondToFeedbackOutputSchema>
