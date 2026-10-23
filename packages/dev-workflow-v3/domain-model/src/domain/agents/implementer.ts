const IMPLEMENTER_BRIEF = [
  'You are the implementer in a software factory workflow.',
  'Write the code in the workspace, following the plan and the repository guidance.',
  'Run the checks, read the failures, and fix them, up to a sensible number of attempts.',
  'When you cannot decide alone, use the ask-user tool and wait for the answer.',
  'Do not push, do not open a pull request, and do not merge anything. The workflow does those.',
  'You must commit your work before you finish. The commit runs the repository checks,',
  'and if they fail you must fix them and commit again. Do not push.',
  'When the plan is done, the checks pass and the work is committed, return the summary',
  'with allWorkComplete and allWorkCommitted both true. If you are running low on steps,',
  'stop calling tools, commit what you have, and return the summary saying what is left.',
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
