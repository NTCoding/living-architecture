import { WorkflowError } from '../workflow-execution/workflow-runner'

const CONVENTIONAL_COMMIT_PATTERN =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?: .+/

export class ConventionalCommitTitle {
  private constructor(private readonly title: string) {}

  static parse(title: string): ConventionalCommitTitle {
    if (!CONVENTIONAL_COMMIT_PATTERN.test(title)) {
      throw new WorkflowError(
        `PR title does not follow conventional commit format: "${title}"\n\n` +
          'Expected format: type(scope): subject\n' +
          'Examples:\n' +
          '  feat: add new feature\n' +
          '  fix(api): resolve authentication bug\n' +
          '  chore(deps): update dependencies\n\n' +
          'Either:\n' +
          '  1. Update the GitHub issue title to follow conventional format, or\n' +
          '  2. Use --pr-title to provide a valid title',
      )
    }
    return new ConventionalCommitTitle(title)
  }

  toString(): string {
    return this.title
  }
}

export function validateConventionalCommit(title: string): void {
  ConventionalCommitTitle.parse(title)
}
