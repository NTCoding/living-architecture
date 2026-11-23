import type { AgentInbox } from '@dev-factory-v1/domain-model/domain/planning/inbox/agent-inbox'
import { Epic } from '@dev-factory-v1/domain-model/domain/planning/epic'
import { PlanningStep } from '@dev-factory-v1/domain-model/domain/planning/planning-step'
import type { EpicRepository } from '../data-access/epic/epic-repository'
import type { IdeaRepository } from '../data-access/idea/idea-repository'

/** @riviere-role command-use-case-input */
export interface StartPlanningInput {
  readonly idea: string
}

/** @riviere-role command-use-case-result */
export interface StartPlanningResult {
  readonly epic: string
  readonly step: string
}

/**
 * @riviere-role command-use-case
 *
 * Turns a captured idea into an epic at its first planning step, and tells the planning agent that
 * it can draft the problem definition. The epic folder carries the idea's slug, so an idea and the
 * epic it became are found in the same place.
 */
export class StartPlanning {
  constructor(
    private readonly ideas: IdeaRepository,
    private readonly epics: EpicRepository,
    private readonly inbox: AgentInbox,
    private readonly now: () => string,
  ) {}

  execute(input: StartPlanningInput): StartPlanningResult {
    const time = this.now()
    const idea = this.ideas.load(input.idea)
    const step = PlanningStep.from('problem-definition')
    this.ideas.save(input.idea, idea.startPlanning(input.idea))
    this.epics.save(
      input.idea,
      Epic.from({
        title: idea.title(),
        idea: input.idea,
        stage: { kind: 'planning', step },
        features: [],
        history: [{ event: 'started', step: step.name(), time, reason: null }],
      }),
    )
    this.inbox.append({
      kind: 'planning-started',
      number: this.inbox.lastNumber() + 1,
      time,
      epic: input.idea,
    })
    return { epic: input.idea, step: step.name() }
  }
}
