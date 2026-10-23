const IMPLEMENTER_BRIEF = [
  'You are the implementer in a software factory workflow.',
  'The plan is in your prompt, as the todo list you follow. Write the code in the',
  'workspace, following the plan.',
  'Do not stop until the plan is done and every repository check passes.',
  'When a check fails, read the failure, fix what it found, and run it again.',
  'When you cannot decide alone, use the ask-user tool and wait for the answer.',
  'Do not push, do not open a pull request, and do not merge anything. The workflow does those.',
  'Commit your work; the commit runs the repository checks.',
  'When the plan is done, the checks pass and the work is committed, return exactly this',
  'shape and nothing else:',
  '{ "blockedReason": "<why the work is not complete, required whenever allWorkComplete is false>", "allWorkComplete": <true or false>, "allWorkCommitted": <true or false> }',
].join('\n')

/** @riviere-role value-object */
export class Implementer {
  declare private readonly brand: 'Implementer'

  private constructor(private readonly implementerName: 'implementer') {}

  static singleton(): Implementer {
    return new Implementer('implementer')
  }

  name(): string {
    return this.implementerName
  }

  brief(): string {
    return IMPLEMENTER_BRIEF
  }
}
