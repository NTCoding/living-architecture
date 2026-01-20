import {
  type FeedbackLocation,
  createFeedbackLocation,
  formatFeedbackLocation,
} from './feedback-location'
import { Reviewer } from './reviewer'

export interface ActiveThread {
  type: 'active'
  threadId: string
  location: FeedbackLocation
  author: Reviewer
  body: string
}

export interface ResolvedThread {
  type: 'resolved'
  threadId: string
  location: FeedbackLocation
  author: Reviewer
  body: string
}

export interface OutdatedThread {
  type: 'outdated'
  threadId: string
  location: FeedbackLocation
  author: Reviewer
  body: string
}

export type ReviewThread = ActiveThread | ResolvedThread | OutdatedThread

export interface RawThreadData {
  id: string
  isResolved: boolean
  isOutdated: boolean
  path: string | null
  line: number | null
  comments: {
    nodes: Array<{
      author: { login: string } | null
      body: string
    }>
  }
}

export function classifyThread(raw: RawThreadData): ReviewThread | null {
  if (raw.comments.nodes.length === 0) {
    return null
  }

  const comment = raw.comments.nodes[0]
  const location = createFeedbackLocation(raw.path, raw.line)
  const author = Reviewer.create(comment.author?.login)

  const base = {
    threadId: raw.id,
    location,
    author,
    body: comment.body,
  }

  if (raw.isResolved) {
    return {
      ...base,
      type: 'resolved',
    }
  }

  if (raw.isOutdated) {
    return {
      ...base,
      type: 'outdated',
    }
  }

  return {
    ...base,
    type: 'active',
  }
}

export interface FormattedFeedbackItem {
  threadId: string
  location: string
  author: string
  body: string
}

export function formatThreadForOutput(thread: ReviewThread): FormattedFeedbackItem {
  return {
    threadId: thread.threadId,
    location: formatFeedbackLocation(thread.location),
    author: thread.author.value,
    body: thread.body,
  }
}
