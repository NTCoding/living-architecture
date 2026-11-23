import type { ReadIssueStates } from '@dev-factory-v1/domain-model/domain/ports/read-issue-states'
import type { EpicRepository } from '../data-access/epic/epic-repository'

/** @riviere-role query-model-use-case-input */
export interface ShowEpicInput {
  readonly epic: string
}

/** @riviere-role query-model-value */
export interface EpicStory {
  readonly number: number
  readonly closed: boolean
}

/** @riviere-role query-model-value */
export interface EpicFeature {
  readonly id: string
  readonly title: string
  readonly stories: readonly EpicStory[]
}

/** @riviere-role query-model-value */
export interface EpicHistoryLine {
  readonly event: string
  readonly step: string | null
  readonly time: string
  readonly reason: string | null
}

/** @riviere-role query-model */
export interface EpicView {
  readonly slug: string
  readonly title: string
  readonly stage: string
  readonly step: string | null
  readonly features: readonly EpicFeature[]
  readonly history: readonly EpicHistoryLine[]
}

/**
 * @riviere-role query-model-use-case
 *
 * One epic with the stories of each feature and whether each story's issue is closed. The newest
 * run of a story is added by the runs entrypoint, because a feature does not read another.
 */
export class ShowEpic {
  constructor(
    private readonly epics: EpicRepository,
    private readonly issueStates: ReadIssueStates,
  ) {}

  async execute(input: ShowEpicInput): Promise<EpicView> {
    const epic = this.epics.load(input.epic)
    const states = await this.issueStates(epic.stories())
    const stage = epic.stage()
    return {
      slug: input.epic,
      title: epic.title(),
      stage: stage.kind,
      step: stage.kind === 'planning' ? stage.step.name() : null,
      features: epic.features().map((feature) => ({
        id: feature.id,
        title: feature.title,
        stories: feature.stories.map((number) => ({
          number,
          closed: states.find((state) => state.number === number)?.closed === true,
        })),
      })),
      history: epic.history().map((line) => ({
        event: line.event,
        step: line.step,
        time: line.time,
        reason: line.reason,
      })),
    }
  }
}
