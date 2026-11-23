import type { EpicRepository } from '../data-access/epic/epic-repository'
import type { PlanningFoldersLoader } from '../data-access/planning-folders/planning-folders-loader'

/** @riviere-role query-model-use-case-input */
export type ShowPlanningBoardInput = Record<string, never>

/** @riviere-role query-model-value */
export interface PlanningBoardEpic {
  readonly slug: string
  readonly title: string
}

/** @riviere-role query-model-value */
export interface PlanningColumn {
  readonly step: string
  readonly epics: readonly PlanningBoardEpic[]
}

/** @riviere-role query-model */
export interface PlanningBoard {
  readonly columns: readonly PlanningColumn[]
}

const STEPS = [
  'problem-definition',
  'solution-exploration',
  'prd',
  'architecture',
  'dogfooding',
  'delivery-planning',
] as const

/**
 * @riviere-role query-model-use-case
 *
 * The 6 steps of planning, each with the epics that are on it. Every step is a column, whether or
 * not an epic is on it, so the board shows where an epic would go next.
 */
export class ShowPlanningBoard {
  constructor(
    private readonly folders: PlanningFoldersLoader,
    private readonly epics: EpicRepository,
  ) {}

  execute(_input: ShowPlanningBoardInput): PlanningBoard {
    const onStep = this.folders.load().epics.flatMap((slug) => {
      const epic = this.epics.load(slug)
      const stage = epic.stage()
      return stage.kind === 'planning'
        ? [{ step: stage.step.name(), epic: { slug, title: epic.title() } }]
        : []
    })
    return {
      columns: STEPS.map((step) => ({
        step,
        epics: onStep.filter((placed) => placed.step === step).map((placed) => placed.epic),
      })),
    }
  }
}
