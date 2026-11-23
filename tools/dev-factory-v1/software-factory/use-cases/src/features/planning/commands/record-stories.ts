import type { Feature } from '@dev-factory-v1/domain-model'
import type { EpicRepository } from '../data-access/epic/epic-repository'

/** @riviere-role command-use-case-input */
export interface RecordStoriesInput {
  readonly epic: string
  readonly features: readonly Feature[]
}

/** @riviere-role command-use-case-result */
export interface RecordStoriesResult {
  readonly epic: string
  readonly stage: string
  readonly stories: readonly number[]
}

/**
 * @riviere-role command-use-case
 *
 * Records the stories the planning agent created for an epic, once every one of them has a GitHub
 * issue. It moves the epic from creating its stories to implementing them.
 */
export class RecordStories {
  constructor(
    private readonly epics: EpicRepository,
    private readonly now: () => string,
  ) {}

  execute(input: RecordStoriesInput): RecordStoriesResult {
    const recorded = this.epics.load(input.epic).recordStories(input.features, this.now())
    this.epics.save(input.epic, recorded)
    return {
      epic: input.epic,
      stage: recorded.stage().kind,
      stories: recorded.stories(),
    }
  }
}
