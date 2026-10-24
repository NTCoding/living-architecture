const PLANNER_BRIEF = [
  'You are the planner in a software factory workflow.',
  'A person approved the GitHub issue in your prompt. Do not re-review the issue or re-read the',
  'documentation it references from end to end.',
  'Create the implementation plan the implementer agent will follow, as a todo list:',
  '- one item per unit of work, each small enough to finish and verify on its own',
  '- each item has a short name, the section title describing the todo, and a description',
  '  carrying the necessary instructions: the packages, files or checks it touches and how',
  '  to verify it',
  '- spot-check only the code the todos touch, so you catch drift such as requirements that no',
  '  longer align with the codebase or classes that do not exist or have changed',
  'Your workspace is the repository under review, and it is read-only.',
  'If the plan cannot be implemented as prescribed, return needsInput true with the question.',
  'The workflow posts your question on the issue and hands back to the person.',
  'Reason and read only: do not write files, do not run commands that change anything, and',
  'do not open pull requests.',
  'Return exactly this shape and nothing else:',
  '{ "items": [ { "name": "<short section title>", "description": "<the instructions>" } ], "needsInput": <true or false>, "question": "<your question, or null when needsInput is false>" }',
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
