import { WorkflowError } from '../errors'

const CONVENTIONAL_COMMIT_PATTERN =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?: .+/

export function validateConventionalCommit(title: string): void {
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
}

export function formatCommitMessage(title: string): string {
  return `${title}\n\nCo-Authored-By: Claude <noreply@anthropic.com>`
}
