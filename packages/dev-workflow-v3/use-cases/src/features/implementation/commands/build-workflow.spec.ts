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

function planAnswer(needsInput = false, question: string | null = null) {
  return {
    object: { markdown: 'the plan', needsInput, question },
    text: '',
    finishReason: 'stop',
    suspendPayload: null,
  }
}

function resolutionsFrom(prompt: string) {
  return [...prompt.matchAll(/comment (\d+)/g)].map((match) => ({
    commentId: Number(match[1]),
    outcome: 'addressed',
    reason: null,
  }))
}

function implementationAnswer(summary: string, resolutions: readonly unknown[] = []) {
  return {
    object: {
      summary,
      blockedReason: null,
      allWorkComplete: true,
      allWorkCommitted: true,
      resolutions,
    },
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
    generate: async (request) => {
      if (request.agentId === 'planner') return planAnswer()
      if (request.agentId === 'implementer') {
        return implementationAnswer('the change', resolutionsFrom(request.prompt))
      }
      if (request.agentId === 'pull-request-writer') return pullRequestAnswer()
      return verdictAnswer('APPROVED', [])
    },
    checkWorkCommitted: async () => ({
      clean: true,
      hasCommit: true,
      sha: '4d83240f6',
      status: '',
      changedFiles: [{ path: 'src/order.ts' }].map((entry) => entry.path),
    }),
    pushBranch: async () => undefined,
    openPullRequest: async () => ({ number: 549, url: 'https://github.com/o/r/pull/549' }),
    commentOnIssue: async () => ({ createdAt: '2026-10-18T10:00:00Z' }),
    waitForIssueReply: async () => ({ reply: null }),
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
    publishReviewFindings: async (request) => ({
      posted: request.findings.map((finding, index) => ({
        file: finding.file,
        line: finding.line,
        commentId: index + 1,
      })),
    }),
    waitForReviewer: async () => ({ reviewSeen: true, rateLimited: false, comments: [] }),
    replyToReviewComment: async () => undefined,
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

  it('posts the plan on the issue and carries on without asking', async () => {
    const comments: string[] = []
    const { started } = await startedRun({
      commentOnIssue: async (request) => {
        comments.push(request.body)
        return { createdAt: '2026-10-18T10:00:00Z' }
      },
    })

    expect(started.status).toBe('success')
    expect(comments).toStrictEqual([
      expect.stringContaining("[dev-workflow-v3] Implementer's plan\n\nthe plan"),
    ])
  })

  it('carries an issue to a pull request ready for a person', async () => {
    const { started } = await startedRun()

    const finished = started

    expect(finished.status).toBe('success')
    expect(finished).toStrictEqual(
      expect.objectContaining({ result: expect.objectContaining({ readyForHuman: true }) }),
    )
  })

  it('asks on the issue when the plan needs input and carries on with the reply', async () => {
    const comments: string[] = []
    const { started } = await startedRun({
      generate: async (request) =>
        request.agentId === 'planner'
          ? planAnswer(true, 'Should the bound be bytes or lines?')
          : stubs().generate(request),
      commentOnIssue: async (request) => {
        comments.push(request.body)
        return { createdAt: '2026-10-18T10:00:00Z' }
      },
      waitForIssueReply: async () => ({ reply: 'Bytes, 64 KiB.' }),
    })

    expect(started.status).toBe('success')
    expect(comments[0]).toContain('### Needs your input')
    expect(comments[0]).toContain('Should the bound be bytes or lines?')
    expect(started).toStrictEqual(
      expect.objectContaining({ result: expect.objectContaining({ readyForHuman: true }) }),
    )
  })

  it('posts the question heading even when the planner gives no question text', async () => {
    const comments: string[] = []
    await startedRun({
      generate: async (request) =>
        request.agentId === 'planner' ? planAnswer(true, null) : stubs().generate(request),
      commentOnIssue: async (request) => {
        comments.push(request.body)
        return { createdAt: '2026-10-18T10:00:00Z' }
      },
      waitForIssueReply: async () => ({ reply: 'go ahead' }),
    })

    expect(comments[0]).toContain('### Needs your input')
  })

  it('fails when nobody replies on the issue', async () => {
    const { started } = await startedRun({
      generate: async (request) =>
        request.agentId === 'planner'
          ? planAnswer(true, 'Should the bound be bytes or lines?')
          : stubs().generate(request),
    })

    expect(started).toStrictEqual(
      expect.objectContaining({
        status: 'failed',
        error: expect.objectContaining({
          message: expect.stringContaining('Nobody replied on the issue'),
        }),
      }),
    )
  })

  it('suspends when the implementer is blocked and carries on with the answer', async () => {
    const prompts: string[] = []
    const { run, started } = await startedRun({
      generate: async (request) => {
        if (request.agentId !== 'implementer') return stubs().generate(request)
        prompts.push(request.prompt.startsWith('Implement issue') ? 'asking' : request.prompt)
        return prompts.length === 1
          ? {
              object: {
                summary: 'blocked',
                blockedReason: 'Reuse the existing port, or add one?',
                allWorkComplete: false,
                allWorkCommitted: false,
              },
              text: '',
              finishReason: 'stop',
              suspendPayload: null,
            }
          : implementationAnswer('the change')
      },
    })
    const blocked = started
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

    const asked = await run.start({ inputData: startInput })

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
    const asked = await run.start({ inputData: startInput })

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
    const { started } = await startedRun({
      generate: async (request) =>
        request.agentId === 'implementer'
          ? { object: undefined, text: '', finishReason: 'aborted', suspendPayload: null }
          : stubs().generate(request),
    })
    const finished = started

    expect(finished).toStrictEqual(
      expect.objectContaining({
        status: 'failed',
        error: expect.objectContaining({
          message: expect.stringContaining('ran out of time'),
        }),
      }),
    )
  })

  it('says the implementer ran out of steps rather than out of answers', async () => {
    const { started } = await startedRun({
      generate: async (request) =>
        request.agentId === 'implementer'
          ? { object: undefined, text: '', finishReason: 'tool-calls', suspendPayload: null }
          : stubs().generate(request),
    })
    const finished = started

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
    const { started } = await startedRun({
      generate: async (request) =>
        request.agentId === 'implementer'
          ? { object: undefined, text: 'prose', finishReason: 'stop', suspendPayload: null }
          : stubs().generate(request),
    })
    const finished = started

    expect(finished.status).toBe('failed')
  })

  it('keeps an issue title that is already a conventional commit title', async () => {
    const { started } = await startedRun({
      loadIssue: async () => ({ title: 'feat: add a review cycle', body: 'The problem.' }),
    })
    const finished = started

    expect(finished.status).toBe('success')
  })

  it('keeps cycling until the limit and then hands over to a person', async () => {
    const { started } = await startedRun({
      generate: async (request) =>
        isReviewer(request.agentId)
          ? verdictAnswer('OPEN_FEEDBACK', [finding])
          : stubs().generate(request),
    })
    const finished = started

    expect(finished).toStrictEqual(
      expect.objectContaining({
        status: 'success',
        result: expect.objectContaining({ cycleNumber: 3, limitReached: true }),
      }),
    )
  })

  it('fails when the pull request writer does not return the sections', async () => {
    const { started } = await startedRun({
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
    const finished = started

    expect(finished.status).toBe('failed')
  })

  it('fails when a reviewer does not return a verdict', async () => {
    const { started } = await startedRun({
      generate: async (request) =>
        isReviewer(request.agentId)
          ? { object: undefined, text: 'prose', finishReason: 'stop', suspendPayload: null }
          : stubs().generate(request),
    })
    const finished = started

    expect(finished.status).toBe('failed')
  })

  it('fails when three attempts leave the worktree dirty', async () => {
    const { started } = await startedRun({
      generate: async (request) =>
        request.agentId === 'implementer'
          ? {
              object: {
                summary: 'not done',
                blockedReason: null,
                allWorkComplete: false,
                allWorkCommitted: false,
              },
              text: '',
              finishReason: 'stop',
              suspendPayload: null,
            }
          : stubs().generate(request),
      checkWorkCommitted: async () => ({
        clean: false,
        hasCommit: false,
        sha: '',
        status: ' M src/order.ts',
        changedFiles: [],
      }),
    })
    const finished = started

    expect(finished).toStrictEqual(
      expect.objectContaining({
        status: 'failed',
        error: expect.objectContaining({
          message: expect.stringContaining('did not finish the feedback'),
        }),
      }),
    )
  })

  it('fails when the agent says the work is not committed', async () => {
    const { started } = await startedRun({
      generate: async (request) =>
        request.agentId === 'implementer'
          ? {
              object: {
                summary: 'done',
                blockedReason: null,
                allWorkComplete: true,
                allWorkCommitted: false,
              },
              text: '',
              finishReason: 'stop',
              suspendPayload: null,
            }
          : stubs().generate(request),
    })
    const finished = started

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
        comments: [{ commentId: 4306, path: 'src/order.ts', line: 3, body: 'Use the port.' }],
      }),
      generate: async (request) => {
        if (request.prompt.startsWith('Here is the feedback')) {
          feedbackPrompts.push(request.prompt)
        }
        return stubs().generate(request)
      },
    })
    const run = await studio.getWorkflow('review-cycle').createRun({ runId: 'review' })

    await run.start({ inputData: reviewInput() })

    expect(feedbackPrompts[0]).toContain('src/order.ts:3')
    expect(feedbackPrompts[0]).toContain('Use the port.')
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

  it('answers every finding with what was done, from the data the agent returned', async () => {
    const replies: { readonly commentId: number; readonly body: string }[] = []
    const studio = await factoryFor({
      generate: async (request) =>
        request.prompt.startsWith('Here is the feedback')
          ? {
              object: {
                blockedReason: null,
                allWorkComplete: true,
                allWorkCommitted: true,
                resolutions: [
                  { commentId: 1, outcome: 'addressed', reason: null },
                  { commentId: 2, outcome: 'partly-addressed', reason: 'Left the actor alone.' },
                  { commentId: 3, outcome: 'not-addressed', reason: 'Conflicts with ADR-002.' },
                  { commentId: 9, outcome: 'addressed', reason: null },
                ],
              },
              text: '',
              finishReason: 'stop',
              suspendPayload: null,
            }
          : stubs().generate(request),
      waitForReviewer: async () => ({
        reviewSeen: true,
        rateLimited: false,
        comments: [{ commentId: 9, path: 'src/order.ts', line: 3, body: 'Use the port.' }],
      }),
      checkWorkCommitted: async () => ({
        clean: true,
        hasCommit: true,
        sha: '4d83240f6',
        status: '',
        changedFiles: ['src/order.ts'],
      }),
      publishReviewFindings: async () => ({
        posted: [
          { file: 'src/order.ts', line: 3, commentId: 1 },
          { file: 'src/order.ts', line: 4, commentId: 2 },
          { file: 'src/order.ts', line: 5, commentId: 3 },
        ],
      }),
      replyToReviewComment: async (request) => {
        replies.push({ commentId: request.commentId, body: request.body })
      },
    })
    const run = await studio.getWorkflow('review-cycle').createRun({ runId: 'review' })

    const started = await run.start({
      inputData: reviewInput({
        findings: [
          {
            reviewer: 'code-review',
            file: 'src/order.ts',
            line: 3,
            rule: null,
            summary: 'One.',
            commentId: 1,
          },
          {
            reviewer: 'code-review',
            file: 'src/order.ts',
            line: 4,
            rule: null,
            summary: 'Two.',
            commentId: 2,
          },
          {
            reviewer: 'code-review',
            file: 'src/order.ts',
            line: 5,
            rule: null,
            summary: 'Three.',
            commentId: 3,
          },
        ],
      }),
    })

    expect(started).toStrictEqual(
      expect.objectContaining({
        status: 'suspended',
        steps: expect.objectContaining({
          'address-feedback': expect.objectContaining({
            suspendPayload: expect.objectContaining({
              rejections: [{ commentId: 3, reason: 'Conflicts with ADR-002.' }],
            }),
          }),
        }),
      }),
    )

    await run.resume({ step: 'address-feedback', resumeData: { approved: true } })

    expect(replies).toStrictEqual([
      { commentId: 1, body: '[dev-workflow-v3] Addressed in 4d83240f.\n\nFiles: src/order.ts' },
      {
        commentId: 2,
        body: '[dev-workflow-v3] Partly addressed in 4d83240f.\n\nFiles: src/order.ts\n\nLeft the actor alone.',
      },
      {
        commentId: 3,
        body: '[dev-workflow-v3] Not changed in 4d83240f.\n\nFiles: src/order.ts\n\nConflicts with ADR-002.',
      },
      { commentId: 9, body: '[dev-workflow-v3] Addressed in 4d83240f.\n\nFiles: src/order.ts' },
    ])
  })

  it('answers a finding without listing files when nothing changed since the cycle began', async () => {
    const replies: string[] = []
    const studio = await factoryFor({
      generate: async (request) =>
        request.prompt.startsWith('Here is the feedback')
          ? {
              object: {
                blockedReason: null,
                allWorkComplete: true,
                allWorkCommitted: true,
                resolutions: [{ commentId: 1, outcome: 'addressed', reason: null }],
              },
              text: '',
              finishReason: 'stop',
              suspendPayload: null,
            }
          : stubs().generate(request),
      waitForReviewer: async () => ({ reviewSeen: true, rateLimited: false, comments: [] }),
      checkWorkCommitted: async () => ({
        clean: true,
        hasCommit: true,
        sha: '4d83240f6',
        status: '',
        changedFiles: [],
      }),
      replyToReviewComment: async (request) => {
        replies.push(request.body)
      },
    })
    const run = await studio.getWorkflow('review-cycle').createRun({ runId: 'review' })

    await run.start({
      inputData: reviewInput({
        findings: [
          {
            reviewer: 'code-review',
            file: 'src/order.ts',
            line: 3,
            rule: null,
            summary: 'One.',
            commentId: 1,
          },
        ],
      }),
    })

    expect(replies).toStrictEqual(['[dev-workflow-v3] Addressed in 4d83240f.'])
  })

  it('suspends when the agent does not answer every finding', async () => {
    const studio = await factoryFor({
      generate: async (request) =>
        request.prompt.startsWith('Here is the feedback')
          ? {
              object: {
                blockedReason: null,
                allWorkComplete: true,
                allWorkCommitted: true,
                resolutions: [],
              },
              text: '',
              finishReason: 'stop',
              suspendPayload: null,
            }
          : stubs().generate(request),
    })
    const run = await studio.getWorkflow('review-cycle').createRun({ runId: 'review' })

    const started = await run.start({
      inputData: reviewInput({
        findings: [
          {
            reviewer: 'code-review',
            file: 'src/order.ts',
            line: 3,
            rule: null,
            summary: 'One.',
            commentId: 1,
          },
        ],
      }),
    })

    expect(started).toStrictEqual(
      expect.objectContaining({
        status: 'suspended',
        steps: expect.objectContaining({
          'address-feedback': expect.objectContaining({
            suspendPayload: expect.objectContaining({ unaddressed: [1] }),
          }),
        }),
      }),
    )
  })

  it('suspends with the reason when the feedback is answered but the tree is not committed', async () => {
    const studio = await factoryFor({
      checkWorkCommitted: async () => ({
        clean: false,
        hasCommit: false,
        sha: '',
        status: ' M src/order.ts',
        changedFiles: [],
      }),
    })
    const run = await studio.getWorkflow('review-cycle').createRun({ runId: 'review' })

    const started = await run.start({
      inputData: reviewInput({
        findings: [
          {
            reviewer: 'code-review',
            file: 'src/order.ts',
            line: 3,
            rule: null,
            summary: 'One.',
            commentId: 1,
          },
        ],
      }),
    })

    expect(started).toStrictEqual(
      expect.objectContaining({
        status: 'suspended',
        steps: expect.objectContaining({
          'address-feedback': expect.objectContaining({
            suspendPayload: expect.objectContaining({
              unaddressed: [1],
              reason: expect.stringContaining('did not finish the feedback'),
            }),
          }),
        }),
      }),
    )
  })

  it('finishes when a finding has no comment to answer', async () => {
    const studio = await factoryFor()
    const run = await studio.getWorkflow('review-cycle').createRun({ runId: 'review' })

    const finished = await run.start({
      inputData: reviewInput({
        findings: [
          {
            reviewer: 'coderabbit',
            file: 'src/order.ts',
            line: 3,
            rule: null,
            summary: 'A comment with no id.',
            commentId: null,
          },
        ],
      }),
    })

    expect(finished.status).toBe('success')
  })

  it('asks for a reason when a rejection has none', async () => {
    const studio = await factoryFor({
      generate: async (request) =>
        request.prompt.startsWith('Here is the feedback')
          ? {
              object: {
                blockedReason: null,
                allWorkComplete: true,
                allWorkCommitted: true,
                resolutions: [{ commentId: 1, outcome: 'not-addressed', reason: null }],
              },
              text: '',
              finishReason: 'stop',
              suspendPayload: null,
            }
          : stubs().generate(request),
    })
    const run = await studio.getWorkflow('review-cycle').createRun({ runId: 'review' })

    const started = await run.start({
      inputData: reviewInput({
        findings: [
          {
            reviewer: 'code-review',
            file: 'src/order.ts',
            line: 3,
            rule: null,
            summary: 'One.',
            commentId: 1,
          },
        ],
      }),
    })

    expect(started).toStrictEqual(
      expect.objectContaining({
        status: 'suspended',
        steps: expect.objectContaining({
          'address-feedback': expect.objectContaining({
            suspendPayload: expect.objectContaining({
              rejections: [{ commentId: 1, reason: 'No reason given.' }],
            }),
          }),
        }),
      }),
    )
  })

  it('stops the cycle when the implementer is blocked while addressing feedback', async () => {
    const studio = await factoryFor({
      generate: async (request) =>
        request.prompt.startsWith('Here is the feedback')
          ? {
              object: {
                summary: 'blocked',
                blockedReason: 'The rule conflicts with the ADR.',
                allWorkComplete: false,
                allWorkCommitted: false,
              },
              text: '',
              finishReason: 'stop',
              suspendPayload: null,
            }
          : stubs().generate(request),
      waitForReviewer: async () => ({
        reviewSeen: true,
        rateLimited: false,
        comments: [{ commentId: 4306, path: 'src/order.ts', line: 3, body: 'Use the port.' }],
      }),
    })
    const run = await studio.getWorkflow('review-cycle').createRun({ runId: 'review' })

    const finished = await run.start({ inputData: reviewInput() })

    expect(finished.status).toBe('failed')
  })

  it('fails the cycle when the checks are red after the fix', async () => {
    const studio = await factoryFor({
      checkWorkCommitted: async () => ({
        clean: false,
        hasCommit: true,
        sha: '4d83240f6',
        status: ' M src/order.ts',
        changedFiles: [],
      }),
    })
    const run = await studio.getWorkflow('review-cycle').createRun({ runId: 'review' })

    const finished = await run.start({ inputData: reviewInput() })

    expect(finished.status).toBe('failed')
  })

  it('fails the run when the nested review cycle fails', async () => {
    const { started } = await startedRun({
      checkWorkCommitted: async () => ({
        clean: false,
        hasCommit: true,
        sha: '4d83240f6',
        status: ' M src/order.ts',
        changedFiles: [],
      }),
    })

    const finished = started

    expect(finished.status).toBe('failed')
  })
})
