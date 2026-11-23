import { decisionBlocksIn } from '@dev-factory-v1/domain-model/domain/planning/decision-block'
import type { PlanningDocumentLoader } from '../data-access/document/planning-document-loader'
import type { ThreadIdsLoader } from '../data-access/thread/thread-ids-loader'
import type { ThreadRepository } from '../data-access/thread/thread-repository'

/** @riviere-role query-model */
export interface PlanningDocumentText {
  readonly name: string
  readonly markdown: string
}

/** @riviere-role query-model-value */
export interface DocumentDecision {
  readonly id: string
  readonly question: string
  readonly pick: string
}

/** @riviere-role query-model-value */
export interface DocumentThread {
  readonly id: string
  readonly waitsFor: string
  readonly firstLine: number
  readonly messages: readonly {
    readonly author: string
    readonly time: string
    readonly text: string
  }[]
}

/** @riviere-role query-model-use-case-input */
export interface ShowPlanningDocumentInput {
  readonly epic: string
  readonly document: string
}

/** @riviere-role query-model */
export interface PlanningDocumentView {
  readonly name: string
  readonly markdown: string
  readonly decisions: readonly DocumentDecision[]
  readonly threads: readonly DocumentThread[]
}

/**
 * @riviere-role query-model-use-case
 *
 * One planning document with the questions it asks and the comments on it. The Markdown is returned
 * as it stands, because rendering it is the job of the process that serves the browser.
 */
export class ShowPlanningDocument {
  constructor(
    private readonly documents: PlanningDocumentLoader,
    private readonly threadIds: ThreadIdsLoader,
    private readonly threads: ThreadRepository,
  ) {}

  execute(input: ShowPlanningDocumentInput): PlanningDocumentView {
    const text = this.documents.load(input.epic, input.document)
    return {
      name: text.name,
      markdown: text.markdown,
      decisions: decisionBlocksIn(text.markdown).map((block) => ({
        id: block.id(),
        question: block.question(),
        pick: block.pick(),
      })),
      threads: this.threadsOn(input.epic, text.name),
    }
  }

  private threadsOn(epic: string, document: string): readonly DocumentThread[] {
    return this.threadIds
      .load(epic)
      .ids.filter((id) => id.startsWith('c-'))
      .map((id) => this.threads.load(epic, id))
      .filter((thread) => thread.document() === document)
      .map((thread) => ({
        id: thread.id(),
        waitsFor: thread.waitsFor(),
        firstLine: thread.anchor().firstLine,
        messages: thread.messages().map((message) => ({
          author: message.author,
          time: message.time,
          text: message.text,
        })),
      }))
  }
}
