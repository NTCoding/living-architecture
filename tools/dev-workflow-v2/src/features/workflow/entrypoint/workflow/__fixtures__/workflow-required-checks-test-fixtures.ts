export const defaultRequiredPullRequestChecks = () => ({
  headRevision: 'b'.repeat(40),
  checks: [{ name: 'main', status: 'passed' as const, detailsUrl: null }],
})
