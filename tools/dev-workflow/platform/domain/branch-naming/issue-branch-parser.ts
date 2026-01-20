const ISSUE_BRANCH_PATTERN = /issue-(\d+)/

export function parseIssueNumber(branch: string): number | undefined {
  const match = ISSUE_BRANCH_PATTERN.exec(branch)
  return match ? parseInt(match[1], 10) : undefined
}
