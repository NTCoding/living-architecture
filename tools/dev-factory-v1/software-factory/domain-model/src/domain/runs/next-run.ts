/**
 * @riviere-role domain-service
 *
 * @riviere-role-justification A run id is a name that Mastra gives a run, and which attempt a
 * name carries is a rule about those names. No aggregate or value object holds a run id, so
 * there is no object whose method this could be.
 */
export function nextRun(
  existing: readonly string[],
  issueNumber: number,
): { readonly runId: string; readonly attempt: number } {
  const base = `issue-${String(issueNumber)}`
  const runId = nextRunIdOf(existing, base)
  return { runId, attempt: attemptOf(runId, base) }
}

function nextRunIdOf(existing: readonly string[], base: string): string {
  if (!existing.includes(base)) return base
  const highest = existing
    .map((runId) => attemptOf(runId, base))
    .filter((attempt) => attempt > 1)
    .reduce((largest, attempt) => Math.max(largest, attempt), 1)
  return `${base}-${String(highest + 1)}`
}

function attemptOf(runId: string, base: string): number {
  if (runId === base) return 1
  const attempt = Number(runId.slice(base.length + 1))
  return Number.isInteger(attempt) && attempt > 0 ? attempt : 1
}
