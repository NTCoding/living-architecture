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

  it('requires the exact IMPLEMENTING prefix before any state response', () => {
    const implementing = readPluginFile('states/implementing.md')

    expect({
      requiresPrefix: implementing.includes('must begin with `🔨 IMPLEMENTING`'),
      requiresPrefixFirst: implementing.includes('It must be the first thing in the response.'),
      namesCommandFailure: implementing.includes(
        'rejects tool use until it has received this exact state prefix',
      ),
      definesPrefixOnlyResponse: implementing.includes(
        'send `🔨 IMPLEMENTING` as the complete response',
      ),
    }).toStrictEqual({
      requiresPrefix: true,
      requiresPrefixFirst: true,
      namesCommandFailure: true,
      definesPrefixOnlyResponse: true,
    })
  })

  it('requires silent execution after implementation plan approval', () => {
    const implementing = readPluginFile('states/implementing.md')

    expect({
      worksSilently: implementing.includes(
        'After the user has approved the implementation plan, work silently.',
      ),
      prohibitsProgressUpdates: implementing.includes('Do not send progress updates'),
      limitsResponses: implementing.includes('Respond only when the user sends a new message'),
    }).toStrictEqual({
      worksSilently: true,
      prohibitsProgressUpdates: true,
      limitsResponses: true,
    })
  })

  it('does not require issue summaries before workflow initialisation', () => {
    const startImplementation = readPluginFile('commands/start-implementation.md')

    expect({
      readsRequirements: startImplementation.includes('Read the requirements from the issue body.'),
      prohibitsSummary: startImplementation.includes('Do not summarise them in the conversation.'),
      doesNotRequireSummary: !startImplementation.includes(
        'Summarize the requirements from the issue body.',
      ),
    }).toStrictEqual({
      readsRequirements: true,
      prohibitsSummary: true,
      doesNotRequireSummary: true,
    })
  })

  it('records an approved scope amendment in the pull request description', () => {
    const feedbackProcedure = readPluginFile('commands/address-pull-request-feedback.md')

    expect(feedbackProcedure).toContain('## Approved scope amendment')
  })
})
