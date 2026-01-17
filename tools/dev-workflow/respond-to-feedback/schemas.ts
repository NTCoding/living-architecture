import { z } from 'zod'

const responseActionSchema = z.enum(['fixed', 'rejected'])

export const respondToFeedbackInputSchema = z.object({
  threadId: z.string().min(1, 'threadId is required'),
  action: responseActionSchema,
  message: z.string().min(1, 'message is required'),
})

export interface RespondToFeedbackOutput {
  success: boolean
  threadId: string
  action: 'fixed' | 'rejected'
  error?: string
}
