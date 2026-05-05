import type { ReviewPayload } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import type { TestContext } from '../../entrypoint/workflow/fixtures/workflow-cli-test-fixtures'
import { runReviewCommand } from '../../entrypoint/workflow/fixtures/workflow-cli-test-fixtures'

type TaskCheckVerdict = 'PASS' | 'FAIL'

function buildPassingReviewPayload(summary: string): ReviewPayload {
  return {
    verdict: 'PASS',
    summary,
    findings: [],
  }
}

/** @riviere-role test-fixture */
export function recordPassingPreReviews(ctx: TestContext): void {
  runReviewCommand(
    ctx,
    'architecture-review',
    buildPassingReviewPayload('Architecture review passed.'),
  )
  runReviewCommand(ctx, 'code-review', buildPassingReviewPayload('Code review passed.'))
  runReviewCommand(ctx, 'bug-scanner', buildPassingReviewPayload('Bug scan passed.'))
}

/** @riviere-role test-fixture */
export function recordTaskCheck(
  ctx: TestContext,
  verdict: TaskCheckVerdict,
  summary?: string,
): void {
  runReviewCommand(ctx, 'task-check', {
    verdict,
    summary: summary ?? (verdict === 'PASS' ? 'Task check passed.' : 'Task check failed.'),
    findings: [],
  })
}
