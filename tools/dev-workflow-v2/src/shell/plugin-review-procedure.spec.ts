import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

const readPluginFile = (path: string): string => readFileSync(join(pluginRoot, path), 'utf8')

describe('review procedure assets', () => {
  it('scopes re-reviews to the changes since the last reviewed commit', () => {
    const pullRequestReview = readPluginFile('commands/review-pull-request.md')

    expect({
      acceptsPreviousCommit: pullRequestReview.includes('previous reviewed commit'),
      reviewsDiff: pullRequestReview.includes('git diff'),
      definesRange: pullRequestReview.includes('review range'),
      firstCycleUsesWholePullRequest: pullRequestReview.includes('first review cycle'),
      passesDecisionHistory: pullRequestReview.includes('decision history'),
    }).toStrictEqual({
      acceptsPreviousCommit: true,
      reviewsDiff: true,
      definesRange: true,
      firstCycleUsesWholePullRequest: true,
      passesDecisionHistory: true,
    })
  })

  it('caps review cycles and records the cap notice', () => {
    const reviewing = readPluginFile('states/reviewing.md')
    const humanReviewing = readPluginFile('states/human_reviewing.md')

    expect({
      statesMaximum: reviewing.includes('maximum of 3 review cycles'),
      namesNotice: reviewing.includes(
        '3 review cycles were completed before all reviewers had approved.',
      ),
      humanHandover: humanReviewing.includes('reviewCycleCapReached'),
    }).toStrictEqual({
      statesMaximum: true,
      namesNotice: true,
      humanHandover: true,
    })
  })

  it('requires a pre-review self-check before leaving implementing', () => {
    const implementing = readPluginFile('states/implementing.md')

    expect({
      auditsDiff: implementing.includes(
        'audit your own diff against the rules the reviewers enforce',
      ),
      runsChecks: implementing.includes('run-many -t lint typecheck test'),
    }).toStrictEqual({ auditsDiff: true, runsChecks: true })
  })

  it('records an approved scope amendment in the pull request description', () => {
    const feedbackProcedure = readPluginFile('commands/address-pull-request-feedback.md')

    expect(feedbackProcedure).toContain('## Approved scope amendment')
  })
})
