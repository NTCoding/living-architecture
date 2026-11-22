/**
 * @riviere-role domain-event
 *
 * One line of `.factory/inbox.jsonl`: something Nick did that the planning agent has not dealt
 * with yet. Every event carries what the agent needs, so that it does not have to open a second
 * file to know why it has been asked to do something.
 */
export type InboxEvent =
  | {
      readonly kind: 'planning-started'
      readonly number: number
      readonly time: string
      readonly epic: string
    }
  | {
      readonly kind: 'comment'
      readonly number: number
      readonly time: string
      readonly epic: string
      readonly item: string
    }
  | {
      readonly kind: 'reply'
      readonly number: number
      readonly time: string
      readonly epic: string
      readonly item: string
      readonly text: string
    }
  | {
      readonly kind: 'decision'
      readonly number: number
      readonly time: string
      readonly epic: string
      readonly item: string
    }
  | {
      readonly kind: 'step-approved'
      readonly number: number
      readonly time: string
      readonly epic: string
      readonly step: string
    }
  | {
      readonly kind: 'sent-back'
      readonly number: number
      readonly time: string
      readonly epic: string
      readonly from: string
      readonly to: string
      readonly reason: string
    }
