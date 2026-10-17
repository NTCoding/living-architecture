type RunTitleState = {
  readonly issueTitle: string
  readonly issueNumber: number
  readonly issueBody: string
  readonly implementationSummary: string
}

const CONVENTIONAL_PREFIX = /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)[(:]/

/**
 * @riviere-role workflow-definition
 */
export function pullRequestTitle(state: RunTitleState): string {
  if (CONVENTIONAL_PREFIX.test(state.issueTitle)) return state.issueTitle
  return `feat: ${state.issueTitle.toLowerCase()}`
}

/**
 * @riviere-role workflow-definition
 */
export function pullRequestDescription(state: RunTitleState): string {
  return [
    '## Problem',
    '',
    state.issueBody,
    '',
    '## Change',
    '',
    state.implementationSummary,
    '',
    `Closes #${state.issueNumber}.`,
  ].join('\n')
}
