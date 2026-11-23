import { Idea } from '@dev-factory-v1/domain-model/domain/planning/idea'
import type { IdeaRepository } from '../data-access/idea/idea-repository'

/** @riviere-role command-use-case-input */
export interface CaptureIdeaInput {
  readonly slug: string
  readonly title: string
  readonly summary: string
}

/** @riviere-role command-use-case-result */
export interface CaptureIdeaResult {
  readonly idea: string
  readonly status: string
}

/**
 * @riviere-role command-use-case
 *
 * Writes a new idea that has just been captured, so that it shows on the overview board. An idea
 * starts as captured and uncertain, because nobody has said yet whether it has to be built.
 */
export class CaptureIdea {
  constructor(private readonly ideas: IdeaRepository) {}

  execute(input: CaptureIdeaInput): CaptureIdeaResult {
    const idea = Idea.from({
      title: input.title,
      status: 'captured',
      need: 'uncertain',
      epic: null,
    })
    this.ideas.create(input.slug, idea, input.summary)
    return { idea: input.slug, status: 'captured' }
  }
}
