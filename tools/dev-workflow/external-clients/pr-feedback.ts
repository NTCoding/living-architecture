import { z } from 'zod'
import { github } from '../external-clients/github'

export const feedbackItemSchema = z.object({
  threadId: z.string(),
  file: z.string().nullish(),
  line: z.number().nullish(),
  author: z.string(),
  body: z.string(),
})
export type FeedbackItem = z.infer<typeof feedbackItemSchema>

export const formattedFeedbackItemSchema = z.object({
  threadId: z.string(),
  location: z.string(),
  author: z.string(),
  body: z.string(),
})
export type FormattedFeedbackItem = z.infer<typeof formattedFeedbackItemSchema>

export function formatFeedbackLocation(file?: string | null, line?: number | null): string {
  if (!file) {
    return 'PR-level'
  }
  if (!line) {
    return file
  }
  return `${file}:${line}`
}

export async function getUnresolvedPRFeedback(prNumber: number): Promise<FormattedFeedbackItem[]> {
  const feedback = await github.getUnresolvedFeedback(prNumber)

  return feedback.map((f) => ({
    threadId: f.threadId,
    location: formatFeedbackLocation(f.file, f.line),
    author: f.author,
    body: f.body,
  }))
}
