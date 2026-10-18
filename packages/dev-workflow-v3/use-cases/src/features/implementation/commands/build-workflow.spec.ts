import { describe, expect, it } from 'vitest'
import { Mastra } from '@mastra/core'
import { BuildWorkflow } from './build-workflow'
import type { BuildWorkflowInput } from './build-workflow'
import { adaptWorkflowToMastra } from '../adapters/mastra/adapt-workflow'

type Stubs = Omit<BuildWorkflowInput, 'adaptWorkflow'>

const MODEL = 'anthropic/claude-sonnet-4-6'

const finding = {
  reviewer: 'code-review',
  file: 'src/order.ts',
  line: 12,
  rule: 'SD-005',
  summary: 'A domain decision sits in the adapter.',
}

const startInput = { issueNumber: 455, model: MODEL, worktreesDirectory: '/worktrees' }

function reviewInput(overrides: Record<string, unknown> = {}) {
  return {
    runId: 'issue-455',
    model: MODEL,
    issueNumber: 455,
    guidance: 'the guidance',
    pullRequestNumber: 549,
    worktreePath: '/worktrees/issue-455',
    branch: 'issue-455-add-a-review-cycle',
    cycleNumber: 1,
    reviewerStatuses: {},
    findings: [],
    approved: false,
    limitReached: false,
    readyForHuman: false,
    ...overrides,
  }
}

function planAnswer() {
  return { object: { markdown: 'the plan' }, text: '', finishReason: 'stop', suspendPayload: null }
}

function implementationAnswer(summary: string) {
  return {
    object: { summary, blockedReason: null },
    text: '',
    finishReason: 'stop',
    suspendPayload: null,
  }
}

function pullRequestAnswer() {
  return {
    object: {
      commitType: 'feat',
      commitScope: 'factory',
      subject: 'Add a review cycle',
      description: 'This adds the review cycle the factory was missing.',
      problem: 'The factory had no review cycle.',
      acceptanceCriteria: '- a review cycle runs',
      keyChanges: '- the workflow',
      architectureImpact: 'None',
      validation: '- pnpm verify passed',
      notes: 'None',
    },
    text: '',
    finishReason: 'stop',
    suspendPayload: null,
  }
}

function isReviewer(agentId: string): boolean {
  return agentId.endsWith('-review') || agentId === 'bug-scanner'
}

function verdictAnswer(status: 'APPROVED' | 'OPEN_FEEDBACK', findings: readonly unknown[]) {
  return { object: { status, findings }, text: '', finishReason: 'stop', suspendPayload: null }
}

function stubs(overrides: Partial<Stubs> = {}): Stubs {
  return {
    loadIssue: async () => ({ title: 'Add a review cycle', body: 'The problem.' }),
    prepareBranch: async () => ({
      worktreePath: '/worktrees/issue-455-add-a-review-cycle',
      branch: 'issue-455-add-a-review-cycle',
    }),
    installDependencies: async () => undefined,
    readGuidance: async () => 'the guidance',
    readReviewerInstructions: async (reviewer) => `instructions for ${reviewer}`,
    generate: async (request) => {
      if (request.agentId === 'planner') return planAnswer()
      if (request.agentId === 'implementer') return implementationAnswer('the change')
      if (request.agentId === 'pull-request-writer') return pullRequestAnswer()
      return verdictAnswer('APPROVED', [])
    },
    verifyWork: async () => ({ green: true, checks: [{ name: 'lint', passed: true }] }),
    commitWork: async () => ({ sha: '4d83240f6' }),
    pushBranch: async () => undefined,
    openPullRequest: async () => ({ number: 549, url: 'https://github.com/o/r/pull/549' }),
    commentOnIssue: async () => undefined,
    commentOnPullRequest: async () => undefined,
    readPullRequestDiff: async () => ({ diff: 'diff --git a/x b/x' }),
    closeReviewCycle: async (request) => ({
      cycleNumber: request.cycleNumber,
      statuses: Object.fromEntries(
        request.verdicts.map((verdict) => [verdict.reviewer, verdict.status]),
      ),
      reviewersToRun: [],
      reviewersLeftOut: [],
      limitReached: request.cycleNumber >= 3,
    }),
    publishReviewFindings: async () => ({ posted: [] }),
    waitForReviewer: async () => ({ reviewSeen: true, rateLimited: false, comments: [] }),
    ...overrides,
  }
}

async function factoryFor(overrides: Partial<Stubs> = {}) {
  const built = await new BuildWorkflow().execute({
    ...stubs(overrides),
    adaptWorkflow: adaptWorkflowToMastra(),
  })
  return new Mastra({
    workflows: {
      'start-implementation': built.startImplementation,
      'review-cycle': built.reviewCycle,
    },
  })
}

async function startedRun(overrides: Partial<Stubs> = {}, runId = 'issue-455') {
  const studio = await factoryFor(overrides)
  const run = await studio.getWorkflow('start-implementation').createRun({ runId })
  const started = await run.start({ inputData: startInput })
  return { run, started }
}

describe('BuildWorkflow', () => {
  it('builds both workflows under the names the shell registers', async () => {
    const studio = await factoryFor()

    expect(studio.getWorkflow('start-implementation').id).toBe('start-implementation')
    expect(studio.getWorkflow('review-cycle').id).toBe('review-cycle')
  })

  it('posts the plan on the issue before it asks for approval', async () => {
    const comments: string[] = []
    const { started } = await startedRun({
      commentOnIssue: async (request) => {
        comments.push(request.body)
      },
    })

    expect(started.status).toBe('suspended')
    expect(comments).toStrictEqual([expect.stringContaining("## Implementer's plan\n\nthe plan")])
  })

  it('carries an issue to a pull request ready for a person', async () => {
    const { run, started } = await startedRun()

    const finished = await run.resume({
      step: 'request-plan-approval',
      resumeData: { approved: true, notes: null },
    })

    expect(started.status).toBe('suspended')
    expect(finished.status).toBe('success')
    expect(finished).toStrictEqual(
      expect.objectContaining({ result: expect.objectContaining({ readyForHuman: true }) }),
    )
  })

  it('stops the run when the plan is rejected', async () => {
    const { run } = await startedRun()

    const finished = await run.resume({
      step: 'request-plan-approval',
      resumeData: { approved: false, notes: null },
    })

    expect(finished.status).toBe('failed')
  })

  it('suspends when the implementer is blocked and carries on with the answer', async () => {
    const prompts: string[] = []
    const { run } = await startedRun({
      generate: async (request) => {
        if (request.agentId !== 'implementer') return stubs().generate(request)
        prompts.push(request.prompt.startsWith('Implement issue') ? 'asking' : request.prompt)
        return prompts.length === 1
          ? {
              object: { summary: 'blocked', blockedReason: 'Reuse the existing port, or add one?' },
              text: '',
              finishReason: 'stop',
              suspendPayload: null,
            }
          : implementationAnswer('the change')
      },
    })
    const blocked = await run.resume({
      step: 'request-plan-approval',
      resumeData: { approved: true, notes: null },
    })
    expect(blocked).toStrictEqual(
      expect.objectContaining({
        status: 'suspended',
        steps: expect.objectContaining({
          implement: expect.objectContaining({
            suspendPayload: expect.objectContaining({
              question: 'Reuse the existing port, or add one?',
            }),
          }),
        }),
      }),
    )
    const finished = await run.resume({ step: 'implement', resumeData: { answer: 'the answer' } })

    expect(prompts).toStrictEqual(['asking', 'the answer'])
    expect(finished.status).toBe('success')
  })

  it('suspends when the implementer asks a question through the tool', async () => {
    const { run } = await startedRun({
      generate: async (request) =>
        request.agentId === 'implementer'
          ? {
              object: undefined,
              text: 'thinking',
              finishReason: 'suspended',
              suspendPayload: { question: 'Which port?', evidence: null },
            }
          : stubs().generate(request),
    })

    const asked = await run.resume({
      step: 'request-plan-approval',
      resumeData: { approved: true, notes: null },
    })

    expect(asked).toStrictEqual(
      expect.objectContaining({
        status: 'suspended',
        steps: expect.objectContaining({
          implement: expect.objectContaining({
            suspendPayload: expect.objectContaining({ question: 'Which port?' }),
          }),
        }),
      }),
    )
  })

  it('asks a fallback question when the agent suspends without one', async () => {
    const { run } = await startedRun({
      generate: async (request) =>
        request.agentId === 'implementer'
          ? { object: undefined, text: '', finishReason: 'suspended', suspendPayload: null }
          : stubs().generate(request),
    })
    const asked = await run.resume({
      step: 'request-plan-approval',
      resumeData: { approved: true, notes: null },
    })

    expect(asked).toStrictEqual(
      expect.objectContaining({
        status: 'suspended',
        steps: expect.objectContaining({
          implement: expect.objectContaining({
            suspendPayload: expect.objectContaining({
              question: 'The implementer is waiting for an answer.',
            }),
          }),
        }),
      }),
    )
  })

  it('fails when the planner does not return a plan', async () => {
    const { started } = await startedRun({
      generate: async (request) =>
        request.agentId === 'planner'
          ? { object: undefined, text: 'prose', finishReason: 'stop', suspendPayload: null }
          : stubs().generate(request),
    })

    expect(started.status).toBe('failed')
  })

  it('says the implementer ran out of time, and keeps the worktree', async () => {
    const { run } = await startedRun({
      generate: async (request) =>
        request.agentId === 'implementer'
          ? { object: undefined, text: '', finishReason: 'aborted', suspendPayload: null }
          : stubs().generate(request),
    })
    const finished = await run.resume({
      step: 'request-plan-approval',
      resumeData: { approved: true, notes: null },
    })

    expect(finished).toStrictEqual(
      expect.objectContaining({
        status: 'failed',
        error: expect.objectContaining({
          message: expect.stringContaining('ran out of time, one hour'),
        }),
      }),
    )
  })

  it('says the implementer ran out of steps rather than out of answers', async () => {
    const { run } = await startedRun({
      generate: async (request) =>
        request.agentId === 'implementer'
          ? { object: undefined, text: '', finishReason: 'tool-calls', suspendPayload: null }
          : stubs().generate(request),
    })
    const finished = await run.resume({
      step: 'request-plan-approval',
      resumeData: { approved: true, notes: null },
    })

    expect(finished).toStrictEqual(
      expect.objectContaining({
        status: 'failed',
        error: expect.objectContaining({
          message: expect.stringContaining('used all its steps without finishing'),
        }),
      }),
    )
  })

  it('fails when the implementer does not return a summary', async () => {
    const { run } = await startedRun({
      generate: async (request) =>
        request.agentId === 'implementer'
          ? { object: undefined, text: 'prose', finishReason: 'stop', suspendPayload: null }
          : stubs().generate(request),
    })
    const finished = await run.resume({
      step: 'request-plan-approval',
      resumeData: { approved: true, notes: null },
    })

    expect(finished.status).toBe('failed')
  })

  it('keeps an issue title that is already a conventional commit title', async () => {
    const { run } = await startedRun({
      loadIssue: async () => ({ title: 'feat: add a review cycle', body: 'The problem.' }),
    })
    const finished = await run.resume({
      step: 'request-plan-approval',
      resumeData: { approved: true, notes: null },
    })

    expect(finished.status).toBe('success')
  })

  it('keeps cycling until the limit and then hands over to a person', async () => {
    const { run } = await startedRun({
      generate: async (request) =>
        isReviewer(request.agentId)
          ? verdictAnswer('OPEN_FEEDBACK', [finding])
          : stubs().generate(request),
    })
    const finished = await run.resume({
      step: 'request-plan-approval',
      resumeData: { approved: true, notes: null },
    })

    expect(finished).toStrictEqual(
      expect.objectContaining({
        status: 'success',
        result: expect.objectContaining({ cycleNumber: 3, limitReached: true }),
      }),
    )
  })

  it('fails when the pull request writer does not return the sections', async () => {
    const { run } = await startedRun({
      generate: async (request) =>
        request.agentId === 'pull-request-writer'
          ? {
              object: { description: 'only this' },
              text: 'prose',
              finishReason: 'stop',
              suspendPayload: null,
            }
          : stubs().generate(request),
    })
    const finished = await run.resume({
      step: 'request-plan-approval',
      resumeData: { approved: true, notes: null },
    })

    expect(finished.status).toBe('failed')
  })

  it('fails when a reviewer does not return a verdict', async () => {
    const { run } = await startedRun({
      generate: async (request) =>
        isReviewer(request.agentId)
          ? { object: undefined, text: 'prose', finishReason: 'stop', suspendPayload: null }
          : stubs().generate(request),
    })
    const finished = await run.resume({
      step: 'request-plan-approval',
      resumeData: { approved: true, notes: null },
    })

    expect(finished.status).toBe('failed')
  })

  it('fails when the checks are red before the commit', async () => {
    const { run } = await startedRun({
      verifyWork: async () => ({ green: false, checks: [{ name: 'lint', passed: false }] }),
    })
    const finished = await run.resume({
      step: 'request-plan-approval',
      resumeData: { approved: true, notes: null },
    })

    expect(finished.status).toBe('failed')
  })

  it('fails when the checks are red before the checks report a check by name', async () => {
    const { run } = await startedRun({
      verifyWork: async () => ({ green: false, checks: [] }),
    })
    const finished = await run.resume({
      step: 'request-plan-approval',
      resumeData: { approved: true, notes: null },
    })

    expect(finished.status).toBe('failed')
  })
})

describe('review cycle', () => {
  it('leaves out a reviewer that already approved', async () => {
    const reviewers: string[] = []
    const studio = await factoryFor({
      generate: async (request) => {
        if (!isReviewer(request.agentId)) return stubs().generate(request)
        reviewers.push(request.agentId)
        return verdictAnswer('APPROVED', [])
      },
    })
    const run = await studio.getWorkflow('review-cycle').createRun({ runId: 'review' })

    await run.start({
      inputData: reviewInput({ reviewerStatuses: { 'architecture-review': 'APPROVED' } }),
    })

    expect(reviewers).toStrictEqual(['code-review', 'bug-scanner'])
  })

  it('addresses the coderabbit comments as feedback', async () => {
    const feedbackPrompts: string[] = []
    const studio = await factoryFor({
      waitForReviewer: async () => ({
        reviewSeen: true,
        rateLimited: false,
        comments: [{ path: 'src/order.ts', line: 3, body: 'Use the port.' }],
      }),
      generate: async (request) => {
        if (request.responseSchema === null) feedbackPrompts.push(request.prompt)
        return stubs().generate(request)
      },
    })
    const run = await studio.getWorkflow('review-cycle').createRun({ runId: 'review' })

    await run.start({ inputData: reviewInput() })

    expect(feedbackPrompts).toStrictEqual([expect.stringContaining('src/order.ts:3 Use the port.')])
  })

  it('does not approve when coderabbit rate limited the pull request', async () => {
    const studio = await factoryFor({
      waitForReviewer: async () => ({ reviewSeen: true, rateLimited: true, comments: [] }),
    })
    const run = await studio.getWorkflow('review-cycle').createRun({ runId: 'review' })

    const finished = await run.start({ inputData: reviewInput() })

    expect(finished).toStrictEqual(
      expect.objectContaining({
        status: 'success',
        result: expect.objectContaining({ approved: false, cycleNumber: 2 }),
      }),
    )
  })

  it('moves to the next cycle when the reviewers have not approved', async () => {
    const studio = await factoryFor({
      generate: async (request) =>
        isReviewer(request.agentId)
          ? verdictAnswer('OPEN_FEEDBACK', [finding])
          : stubs().generate(request),
    })
    const run = await studio.getWorkflow('review-cycle').createRun({ runId: 'review' })

    const finished = await run.start({ inputData: reviewInput() })

    expect(finished).toStrictEqual(
      expect.objectContaining({
        status: 'success',
        result: expect.objectContaining({ approved: false, cycleNumber: 2 }),
      }),
    )
  })

  it('publishes only the findings that are not from coderabbit', async () => {
    const published: { readonly reviewer: string }[][] = []
    const studio = await factoryFor({
      generate: async (request) =>
        isReviewer(request.agentId)
          ? verdictAnswer('OPEN_FEEDBACK', [finding])
          : stubs().generate(request),
      publishReviewFindings: async (request) => {
        published.push(request.findings.map((posted) => ({ reviewer: posted.reviewer })))
        return { posted: [] }
      },
    })
    const run = await studio.getWorkflow('review-cycle').createRun({ runId: 'review' })

    await run.start({ inputData: reviewInput() })

    expect(published).toStrictEqual([
      [
        { reviewer: 'architecture-review' },
        { reviewer: 'code-review' },
        { reviewer: 'bug-scanner' },
      ],
    ])
  })

  it('fails the cycle when the checks are red after the fix', async () => {
    const studio = await factoryFor({
      verifyWork: async () => ({ green: false, checks: [{ name: 'test', passed: false }] }),
    })
    const run = await studio.getWorkflow('review-cycle').createRun({ runId: 'review' })

    const finished = await run.start({ inputData: reviewInput() })

    expect(finished.status).toBe('failed')
  })

  it('fails the run when the nested review cycle fails', async () => {
    const checks: boolean[] = [true, false]
    const { run } = await startedRun({
      verifyWork: async () => ({
        green: checks.shift() === true,
        checks: [{ name: 'test', passed: false }],
      }),
    })

    const finished = await run.resume({
      step: 'request-plan-approval',
      resumeData: { approved: true, notes: null },
    })

    expect(finished.status).toBe('failed')
  })
})
