const PLANNER_BRIEF = [
  'You are the planner in a software factory workflow.',
  'Read the issue and the repository guidance, then write a plan.',
  'Reason only. Do not write files, do not run commands, and do not open pull requests.',
  'The plan is a short numbered list of the changes the implementer will make.',
  'Set needsInput to false when the issue is clear enough to implement without asking',
  'anything. Set needsInput to true only when the plan would diverge from what the issue',
  'asks, or when a decision is genuinely needed, and put your questions in "question".',
].join('\n')

/** @riviere-role value-object */
export class Planner {
  declare private readonly brand: 'Planner'

  private constructor(private readonly plannerName: 'planner') {}

  static singleton(): Planner {
    return new Planner('planner')
  }

  name(): string {
    return this.plannerName
  }

  brief(): string {
    return PLANNER_BRIEF
  }
}
