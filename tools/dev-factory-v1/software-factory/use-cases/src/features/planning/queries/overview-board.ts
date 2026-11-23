import type { Epic } from '@dev-factory-v1/domain-model/domain/planning/epic'
import type { Idea } from '@dev-factory-v1/domain-model/domain/planning/idea'
import type { EpicRepository } from '../data-access/epic/epic-repository'
import type { IdeaRepository } from '../data-access/idea/idea-repository'
import type { PlanningFoldersLoader } from '../data-access/planning-folders/planning-folders-loader'

/** @riviere-role query-model-use-case-input */
export type ShowOverviewBoardInput = Record<string, never>

/** @riviere-role query-model-value */
export interface BoardIdea {
  readonly slug: string
  readonly title: string
  readonly need: string
  readonly action: string
}

/** @riviere-role query-model-value */
export interface BoardEpic {
  readonly slug: string
  readonly title: string
  readonly step: string | null
  readonly stories: number
}

/** @riviere-role query-model */
export interface OverviewBoard {
  readonly ideas: readonly BoardIdea[]
  readonly planning: readonly BoardEpic[]
  readonly inProgress: readonly BoardEpic[]
  readonly done: readonly BoardEpic[]
}

const START_PLANNING = 'start-planning'

/**
 * @riviere-role query-model-use-case
 *
 * The 4 columns of the overview board. An idea is in the first column until it starts planning, and
 * an epic is in 1 of the other 3, according to its stage. A story that is still open does not move
 * the epic, because the stage is what its `epic.yml` says.
 */
export class ShowOverviewBoard {
  constructor(
    private readonly folders: PlanningFoldersLoader,
    private readonly ideas: IdeaRepository,
    private readonly epics: EpicRepository,
  ) {}

  execute(_input: ShowOverviewBoardInput): OverviewBoard {
    const folders = this.folders.load()
    const ideas = folders.ideas
      .map((slug) => ({ slug, idea: this.ideas.load(slug) }))
      .filter(({ idea }) => idea.status() === 'captured')
      .map(({ slug, idea }) => ideaOf(slug, idea))
    const epics = folders.epics.map((slug) => ({ slug, epic: this.epics.load(slug) }))
    return {
      ideas,
      planning: epics
        .filter(({ epic }) => epic.stage().kind === 'planning')
        .map(({ slug, epic }) => epicOf(slug, epic)),
      inProgress: epics
        .filter(({ epic }) => epic.stage().kind === 'in-progress')
        .map(({ slug, epic }) => epicOf(slug, epic)),
      done: epics
        .filter(({ epic }) => epic.stage().kind === 'done')
        .map(({ slug, epic }) => epicOf(slug, epic)),
    }
  }
}

function ideaOf(slug: string, idea: Idea): BoardIdea {
  return { slug, title: idea.title(), need: idea.need(), action: START_PLANNING }
}

function epicOf(slug: string, epic: Epic): BoardEpic {
  const stage = epic.stage()
  return {
    slug,
    title: epic.title(),
    step: stage.kind === 'planning' ? stage.step.name() : null,
    stories: epic.stories().length,
  }
}
