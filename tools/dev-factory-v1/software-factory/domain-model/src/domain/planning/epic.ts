import { NotAnEarlierStep, PlanningStep } from './planning-step'

/** @riviere-role domain-error */
export class InvalidEpic extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidEpic'
  }
}

/**
 * @riviere-role domain-event
 *
 * A group of stories that belong together in an epic. The stories are the numbers of their GitHub
 * issues, which only exist once delivery planning is done.
 */
export type Feature = {
  readonly id: string
  readonly title: string
  readonly stories: readonly number[]
}

/**
 * @riviere-role domain-event
 *
 * Something that happened to an epic, with when and, for a send back, why.
 */
export type EpicHistoryEntry = {
  readonly event: string
  readonly step: string | null
  readonly time: string
  readonly reason: string | null
}

/**
 * @riviere-role domain-event
 *
 * Where the epic is. It is at one planning step until delivery planning is approved, then its
 * stories are created, then they are implemented, then it is done.
 */
export type EpicStage =
  | { readonly kind: 'planning'; readonly step: PlanningStep }
  | { readonly kind: 'creating-stories' }
  | { readonly kind: 'in-progress' }
  | { readonly kind: 'done' }

type EpicFields = {
  readonly title: string
  readonly idea: string | null
  readonly stage: EpicStage
  readonly features: readonly Feature[]
  readonly history: readonly EpicHistoryEntry[]
}

const CLOSED_STORY_COUNT = 0

function issueListOf(stories: readonly number[]): string {
  return stories.map((story) => `#${String(story)}`).join(', ')
}

/**
 * @riviere-role aggregate
 *
 * An epic goes through the planning steps one at a time. It only moves forward when a step is
 * approved and nothing on that step's document waits for Nick, and it only moves back to an
 * earlier step, which is why the rules live here rather than in the commands.
 */
export class Epic {
  private constructor(
    private readonly epicTitle: string,
    private readonly sourceIdea: string | null,
    private readonly where: EpicStage,
    private readonly featureList: readonly Feature[],
    private readonly events: readonly EpicHistoryEntry[],
  ) {}

  static from(fields: EpicFields): Epic {
    if (fields.title.trim() === '') {
      throw new InvalidEpic('An epic has a title.')
    }
    return new Epic(fields.title.trim(), fields.idea, fields.stage, fields.features, fields.history)
  }

  title(): string {
    return this.epicTitle
  }

  idea(): string | null {
    return this.sourceIdea
  }

  stage(): EpicStage {
    return this.where
  }

  features(): readonly Feature[] {
    return this.featureList
  }

  history(): readonly EpicHistoryEntry[] {
    return this.events
  }

  stories(): readonly number[] {
    return this.featureList.flatMap((feature) => feature.stories)
  }

  approve(step: PlanningStep, openItems: number, time: string): Epic {
    const current = this.planningStep()
    if (current === null) {
      throw new InvalidEpic(
        `The epic ${this.epicTitle} is not being planned, so nothing can be approved.`,
      )
    }
    if (!current.equals(step)) {
      throw new InvalidEpic(
        `The epic ${this.epicTitle} is at ${current.name()}, so ${step.name()} cannot be approved.`,
      )
    }
    if (openItems > CLOSED_STORY_COUNT) {
      throw new InvalidEpic(
        `${String(openItems)} items on ${step.name()} still wait for Nick, so the step cannot be approved.`,
      )
    }
    const next = step.next()
    return this.movedTo(
      next === null ? { kind: 'creating-stories' } : { kind: 'planning', step: next },
      { event: 'approved', step: step.name(), time, reason: null },
    )
  }

  sendBack(to: PlanningStep, reason: string, time: string): Epic {
    const current = this.planningStep()
    if (current === null) {
      throw new InvalidEpic(
        `The epic ${this.epicTitle} is not being planned, so nothing can be sent back.`,
      )
    }
    if (!to.isBefore(current)) {
      throw new NotAnEarlierStep(current.name(), to.name())
    }
    if (reason.trim() === '') {
      throw new InvalidEpic('A send back says why, so that the agent knows what to change.')
    }
    return this.movedTo(
      { kind: 'planning', step: to },
      { event: 'sent-back', step: to.name(), time, reason: reason.trim() },
    )
  }

  recordStories(features: readonly Feature[], time: string): Epic {
    if (this.where.kind !== 'creating-stories') {
      throw new InvalidEpic(
        `The epic ${this.epicTitle} is at ${this.where.kind}, so its stories cannot be recorded now.`,
      )
    }
    return new Epic(this.epicTitle, this.sourceIdea, { kind: 'in-progress' }, features, [
      ...this.events,
      { event: 'stories-recorded', step: null, time, reason: null },
    ])
  }

  finish(closedStories: readonly number[], time: string): Epic {
    if (this.where.kind !== 'in-progress') {
      throw new InvalidEpic(
        `The epic ${this.epicTitle} is at ${this.where.kind}, so it cannot be finished.`,
      )
    }
    const stillOpen = this.stories().filter((story) => !closedStories.includes(story))
    if (stillOpen.length > CLOSED_STORY_COUNT) {
      throw new InvalidEpic(
        `The epic ${this.epicTitle} still has open stories: ${issueListOf(stillOpen)}.`,
      )
    }
    return new Epic(this.epicTitle, this.sourceIdea, { kind: 'done' }, this.featureList, [
      ...this.events,
      { event: 'finished', step: null, time, reason: null },
    ])
  }

  private planningStep(): PlanningStep | null {
    return this.where.kind === 'planning' ? this.where.step : null
  }

  private movedTo(stage: EpicStage, entry: EpicHistoryEntry): Epic {
    return new Epic(this.epicTitle, this.sourceIdea, stage, this.featureList, [
      ...this.events,
      entry,
    ])
  }
}
