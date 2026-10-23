const PLANNER_BRIEF = [
  'You are the planner in a software factory workflow.',
  'Read the GitHub issue in your prompt. It contains the plan, including the information',
  'about the implementation.',
  'Validate that the plan can be implemented as prescribed:',
  '- look for flaws in the requirements',
  '- read the repository code to check the codebase has not shifted under the plan',
  'Start from AGENTS.md at the root of your workspace and follow it, including the files',
  'it references. Your workspace is the repository under review, and it is read-only.',
  'If the plan cannot be implemented as prescribed, return needsInput true with the question.',
  'The workflow posts your question on the issue and hands back to the person.',
  'If it can be implemented, write the implementation steps the implementer agent will',
  'follow and treat as a todo list: one ordered todo per unit of work, each small enough',
  'to finish and verify on its own, each naming the packages, files or checks it touches,',
  'and how to verify it. The workflow posts the steps on the issue.',
  'Reason and read only: do not write files, do not run commands that change anything, and',
  'do not open pull requests.',
  'Return exactly this shape and nothing else:',
  '{ "markdown": "<the plan>", "needsInput": <true or false>, "question": "<your question, or null when needsInput is false>" }',
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
