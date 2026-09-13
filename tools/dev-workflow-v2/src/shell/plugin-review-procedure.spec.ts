import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const readPluginFile = (path: string): string => readFileSync(join(pluginRoot, path), 'utf8')

describe('review procedure assets', () => {
  it('receives validated review inputs and reviews only their diff range', () => {
    const pullRequestReview = readPluginFile('commands/review-pull-request.md')

    expect({
      usesReviewInputs: pullRequestReview.includes('get-review-inputs'),
      reviewsDiff: pullRequestReview.includes('git diff <range>'),
      givesDecisionHistory: pullRequestReview.includes('decisionHistory'),
      doesNotGatherGithubContext: !pullRequestReview.includes('gh api graphql'),
    }).toStrictEqual({
      usesReviewInputs: true,
      reviewsDiff: true,
      givesDecisionHistory: true,
      doesNotGatherGithubContext: true,
    })
  })

  it('assigns review cap handling to the cycle-close operation', () => {
    const reviewing = readPluginFile('states/reviewing.md')
    const humanReviewing = readPluginFile('states/human_reviewing.md')

    expect({
      closesCycle: reviewing.includes('wait-for-coderabbit-and-close-review-cycle'),
      avoidsCapState: !reviewing.includes('reviewCycleCapReached'),
      humanWaits: humanReviewing.includes('wait for the human'),
      avoidsCapComment: !humanReviewing.includes('3 review cycles were completed'),
    }).toStrictEqual({
      closesCycle: true,
      avoidsCapState: true,
      humanWaits: true,
      avoidsCapComment: true,
    })
  })

  it('requires a pre-review self-check before leaving implementing', () => {
    const implementing = readPluginFile('states/implementing.md')
    expect({
      auditsDiff: implementing.includes(
        'audit your own diff against the rules the reviewers enforce',
      ),
      runsChecks: implementing.includes('run-many -t lint typecheck test'),
      submitsPullRequest: implementing.includes('transition SUBMITTING_PR'),
    }).toStrictEqual({ auditsDiff: true, runsChecks: true, submitsPullRequest: true })
  })

  it('records an approved scope amendment in the pull request description', () => {
    expect(readPluginFile('commands/address-pull-request-feedback.md')).toContain(
      '## Approved scope amendment',
    )
  })
})
