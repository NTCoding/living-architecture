import { github } from '../external-clients/github'

export interface FeedbackItem {
  threadId: string
  file?: string
  line?: number
  author: string
  body: string
}

export interface FormattedFeedbackItem {
  threadId: string
  location: string
  author: string
  body: string
}

export function formatFeedbackLocation(file?: string, line?: number): string {
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
