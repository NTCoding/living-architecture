import type { CreatePullRequestFailure } from '@living-architecture/dev-workflow-v2-use-cases/commands/create-pull-request-result'

/** @riviere-role cli-output-formatter */
export function formatPullRequestDetailsFailure(failure: CreatePullRequestFailure): string {
  switch (failure.type) {
    case 'unsupported-commit-type':
      return `Expected --commit-type to be one of: ${failure.supportedNames.join(', ')}.`
    case 'invalid-commit-scope':
      return 'Expected --commit-scope to be non-empty, single-line, and at most 20 characters.'
    case 'empty-pull-request-title':
      return 'Expected non-empty value for --title.'
    case 'pull-request-title-ends-with-full-stop':
      return 'Expected --title to not end with a full stop.'
    case 'pull-request-title-has-uppercase':
      return 'Expected --title to use lower case.'
    case 'pull-request-description-too-short':
      return 'Expected --description to be at least 100 characters.'
    case 'composed-title-too-long':
      return 'Expected composed pull request title to be at most 100 characters.'
  }
}
