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
  commentId: null,
}

const startInput = {
  issueNumber: 455,
  model: MODEL,
  thinking: 'low',
  reviewers: ['architecture-review', 'code-review', 'bug-scanner'],
  worktreesDirectory: '/worktrees',
}

function reviewInput(overrides: Record<string, unknown> = {}) {
  return {
    runId: 'issue-455',
    model: MODEL,
    thinking: 'low',
    reviewers: ['architecture-review', 'code-review', 'bug-scanner'],
    issueNumber: 455,
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
    object: {
      items: [{ name: 'do the thing', description: 'Change the thing, then run its checks.' }],
      needsInput,
      question,
    },
    text: '',
    finishReason: 'stop',
    suspendPayload: null,
  }
}

function resolutionsFrom(prompt: string) {
  return [...prompt.matchAll(/comment (\d+)/g)].map((match) => ({
    commentId: Number(match[1]),
    outcome: 'addressed',
    response: 'Addressed in the workspace.',
  }))
}

function implementationAnswer(summary: string, resolutions: readonly unknown[] = []) {
  return {
    object: {
      outcome: 'complete',
      summary,
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

class NoGuidanceInWorktree extends Error {}

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
    readRepoGuidance: () => 'REPO RULES',
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
    waitForReviewer: async () => ({
      reviewSeen: true,
      rateLimited: false,
      verdict: 'approved',
      summary: null,
      comments: [],
    }),
    replyToReviewComment: async () => undefined,
    recordRunOutcome: async () => undefined,
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

async function scoresOf(
  workflow: 'start-implementation' | 'review-cycle',
  id: string,
  output: unknown,
) {
  const studio = await factoryFor()
  const scorers = await studio.getWorkflow(workflow).listScorers()
  const scored = await Promise.all(
    Object.entries(scorers)
      .filter(([scorerId]) => scorerId === id)
      .map(async ([, entry]) => (await entry.scorer.run({ input: {}, output })).score),
  )
  return scored
}

describe('the scorers that say whether a model was good enough', () => {
  it('gives a full score to a plan with items and nothing to ask', async () => {
    const output = {
      ...startInput,
      planItems: [{ name: 'do the thing', description: 'Run the checks.' }],
      planNeedsInput: false,
    }

    expect(await scoresOf('start-implementation', 'draft-plan-quality', output)).toStrictEqual([1])
  })

  it('marks a plan down when it has no items', async () => {
    const output = { ...startInput, planItems: [], planNeedsInput: false }

    expect(await scoresOf('start-implementation', 'draft-plan-quality', output)).toStrictEqual([
      1 / 3,
    ])
  })

  it('marks a plan down when an item has no name', async () => {
    const output = {
      ...startInput,
      planItems: [{ name: '  ', description: 'Run the checks.' }],
      planNeedsInput: false,
    }

    expect(await scoresOf('start-implementation', 'draft-plan-quality', output)).toStrictEqual([
      2 / 3,
    ])
  })

  it('marks a plan down when an item has no description', async () => {
    const output = {
      ...startInput,
      planItems: [{ name: 'do the thing', description: '  ' }],
      planNeedsInput: false,
    }

    expect(await scoresOf('start-implementation', 'draft-plan-quality', output)).toStrictEqual([
      2 / 3,
    ])
  })

  it('marks a plan down when it quietly asks for input without a question', async () => {
    const output = {
      ...startInput,
      planItems: [{ name: 'do the thing', description: 'Run the checks.' }],
      planNeedsInput: true,
      planQuestion: null,
    }

    expect(await scoresOf('start-implementation', 'draft-plan-quality', output)).toStrictEqual([
      2 / 3,
    ])
  })

  it('gives a full score to a pull request in the repository format', async () => {
    const output = {
      ...startInput,
      pullRequestTitle: 'feat(factory): add a review cycle',
      pullRequestBody: [
        '## Description',
        '## Linked Issue',
        '## What Problem Does This PR Solve?',
        '## Acceptance Criteria',
        '## Key Changes',
        '## Validation',
      ].join('\n\n'),
    }

    expect(
      await scoresOf('start-implementation', 'draft-pull-request-quality', output),
    ).toStrictEqual([1])
  })

  it('gives no score to a pull request with no title and no sections', async () => {
    const output = { ...startInput, pullRequestTitle: 'Added it', pullRequestBody: '' }

    expect(
      await scoresOf('start-implementation', 'draft-pull-request-quality', output),
    ).toStrictEqual([0])
  })

  it('gives a full score to a reviewer that approved with nothing to say', async () => {
    const output = { state: reviewInput(), verdicts: [], findings: [] }

    expect(await scoresOf('review-cycle', 'code-review-quality', output)).toStrictEqual([1])
  })

  it('marks a reviewer down for a finding with no rule and a thin summary', async () => {
    const output = {
      state: reviewInput(),
      verdicts: [],
      findings: [
        { ...finding, rule: null, summary: 'Bad.' },
        { ...finding, summary: `A domain decision sits in the adapter. ${'x'.repeat(60)}` },
      ],
    }

    expect(await scoresOf('review-cycle', 'code-review-quality', output)).toStrictEqual([0.5])
  })
})

describe('BuildWorkflow', () => {
  it('builds both workflows under the names the shell registers', async () => {
    const studio = await factoryFor()

    expect(studio.getWorkflow('start-implementation').id).toBe('start-implementation')
    expect(studio.getWorkflow('review-cycle').id).toBe('review-cycle')
  })

  it('sends the repo guidance before the role instructions when the generation runs in a workspace', async () => {
    const instructions: string[] = []
    const { started } = await startedRun({
      readRepoGuidance: () => 'REPO RULES',
      generate: async (request) => {
        instructions.push(request.instructions)
        if (request.agentId === 'planner') return planAnswer()
        if (request.agentId === 'implementer') {
          return implementationAnswer('the change', resolutionsFrom(request.prompt))
        }
        if (request.agentId === 'pull-request-writer') return pullRequestAnswer()
        return verdictAnswer('APPROVED', [])
      },
    })

    expect(started.status).toBe('success')
    expect(instructions.every((entry) => entry.startsWith('REPO RULES'))).toBe(true)
    expect(
      instructions.every((entry) =>
        entry.includes(
          'A subdirectory may contain its own AGENTS.md; its rules apply to the files under it.',
        ),
      ),
    ).toBe(true)
    expect(instructions.some((entry) => entry.includes('You are the planner'))).toBe(true)
  })

  it('fails before installing dependencies when the workspace carries no AGENTS.md', async () => {
    const installs: unknown[] = []
    const { started } = await startedRun({
      readRepoGuidance: () => {
        throw new NoGuidanceInWorktree('The workspace carries no AGENTS.md.')
      },
      installDependencies: async (request) => {
        installs.push(request)
      },
    })

    expect(started.status).toBe('failed')
    expect(installs).toStrictEqual([])
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
      expect.stringContaining(
        "[dev-workflow-v3] Implementer's plan\n\n### 1. do the thing\n\nChange the thing, then run its checks.",
      ),
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

  it('posts the question on the issue and suspends for the person when the plan needs input', async () => {
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
    })

    expect(started.status).toBe('suspended')
    expect(comments[0]).toContain('### Needs your input')
    expect(comments[0]).toContain('Should the bound be bytes or lines?')
    expect(started).toStrictEqual(
      expect.objectContaining({
        steps: expect.objectContaining({
          'wait-for-plan-clarification': expect.objectContaining({
            suspendPayload: expect.objectContaining({
              question: 'Should the bound be bytes or lines?',
            }),
          }),
        }),
      }),
    )
  })

  it('carries on with the answer when the person replies to the plan question', async () => {
    const { run } = await startedRun({
      generate: async (request) =>
        request.agentId === 'planner'
          ? planAnswer(true, 'Should the bound be bytes or lines?')
          : stubs().generate(request),
    })

    const finished = await run.resume({
      step: 'wait-for-plan-clarification',
      resumeData: { answer: 'Bytes, 64 KiB.' },
    })

    expect(finished.status).toBe('success')
    expect(finished).toStrictEqual(
      expect.objectContaining({ result: expect.objectContaining({ readyForHuman: true }) }),
    )
  })

  it('posts the question heading even when the planner gives no question text', async () => {
    const comments: string[] = []
    const { run, started } = await startedRun({
      generate: async (request) =>
        request.agentId === 'planner' ? planAnswer(true, null) : stubs().generate(request),
      commentOnIssue: async (request) => {
        comments.push(request.body)
        return { createdAt: '2026-10-18T10:00:00Z' }
      },
    })

    expect(started.status).toBe('suspended')
    expect(comments[0]).toContain('### Needs your input')

    await run.resume({
      step: 'wait-for-plan-clarification',
      resumeData: { answer: 'go ahead' },
    })
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
                outcome: 'blocked',
                blockedReason: 'Reuse the existing port, or add one?',
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
    const finished = await run.resume({
      step: 'implement',
      resumeData: { answer: 'the answer', question: 'Reuse the existing port, or add one?' },
    })

    expect(prompts).toStrictEqual([
      'asking',
      '<question>\nReuse the existing port, or add one?\n</question>\n\n<answer>\nthe answer\n</answer>',
    ])
    expect(finished.status).toBe('success')
  })

  it('carries on with just the answer when the resume has no question', async () => {
    const prompts: string[] = []
    const { run } = await startedRun({
      generate: async (request) => {
        if (request.agentId !== 'implementer') return stubs().generate(request)
        prompts.push(request.prompt.startsWith('Implement issue') ? 'asking' : request.prompt)
        return prompts.length === 1
          ? {
              object: {
                summary: 'blocked',
                outcome: 'blocked',
                blockedReason: 'Which port?',
                allWorkCommitted: false,
              },
              text: '',
              finishReason: 'stop',
              suspendPayload: null,
            }
          : implementationAnswer('the change')
      },
    })
    const finished = await run.resume({ step: 'implement', resumeData: { answer: 'the answer' } })

    expect(prompts).toStrictEqual(['asking', '<answer>\nthe answer\n</answer>'])
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

  it('records the outcome of every run that ends', async () => {
    const recorded: { readonly runId: string; readonly status: string }[] = []
    await startedRun({
      recordRunOutcome: async (outcome) => {
        recorded.push({ runId: outcome.runId, status: outcome.status })
      },
    })

    expect(recorded).toContainEqual({ runId: 'issue-455', status: 'success' })
  })

  it('writes the failure down and says so on the issue when a run fails', async () => {
    const recorded: { readonly status: string; readonly message: string }[] = []
    const comments: string[] = []
    await startedRun({
      generate: async (request) =>
        request.agentId === 'planner'
          ? { object: undefined, text: 'prose', finishReason: 'stop', suspendPayload: null }
          : stubs().generate(request),
      recordRunOutcome: async (outcome) => {
        recorded.push({ status: outcome.status, message: outcome.message })
      },
      commentOnIssue: async (request) => {
        comments.push(request.body)
        return { createdAt: '2026-10-18T10:00:00Z' }
      },
    })

    expect(recorded).toContainEqual({
      status: 'failed',
      message: expect.stringContaining('The planner did not return the expected data'),
    })
    expect(comments.join('\n')).toContain('The run issue-455 stopped.')
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
                summary: 'done',
                outcome: 'complete',
                allWorkCommitted: true,
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
          message: expect.stringContaining('the worktree disagrees'),
        }),
      }),
    )
  })

  it('fails when the implementer claims completion without a commit', async () => {
    const { started } = await startedRun({
      generate: async (request) =>
        request.agentId === 'implementer'
          ? {
              object: {
                summary: 'done',
                outcome: 'complete',
                allWorkCommitted: true,
              },
              text: '',
              finishReason: 'stop',
              suspendPayload: null,
            }
          : stubs().generate(request),
      checkWorkCommitted: async () => ({
        clean: true,
        hasCommit: false,
        sha: '',
        status: '',
        changedFiles: [],
      }),
    })

    expect(started).toStrictEqual(
      expect.objectContaining({
        status: 'failed',
        error: expect.objectContaining({
          message: expect.stringContaining('no commit of the implementer yet'),
        }),
      }),
    )
  })

  it('suspends with the reason when the implementer quits without finishing', async () => {
    const { started } = await startedRun({
      generate: async (request) =>
        request.agentId === 'implementer'
          ? {
              object: {
                summary: 'not done',
                outcome: 'blocked',
                blockedReason: 'I could not add the port because the schema types are missing.',
                allWorkCommitted: false,
              },
              text: '',
              finishReason: 'stop',
              suspendPayload: null,
            }
          : stubs().generate(request),
    })

    expect(started).toStrictEqual(
      expect.objectContaining({
        status: 'suspended',
        steps: expect.objectContaining({
          implement: expect.objectContaining({
            suspendPayload: expect.objectContaining({
              question: 'I could not add the port because the schema types are missing.',
            }),
          }),
        }),
      }),
    )
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

  it('leaves out a reviewer that is not in the reviewer list', async () => {
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
      inputData: reviewInput({ reviewers: ['code-review'] }),
    })

    expect(reviewers).toStrictEqual(['code-review'])
  })

  it('addresses the coderabbit comments as feedback', async () => {
    const feedbackPrompts: string[] = []
    const studio = await factoryFor({
      waitForReviewer: async () => ({
        reviewSeen: true,
        rateLimited: false,
        verdict: 'approved',
        summary: null,
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

  it('posts every reviewer verdict when the run finishes', async () => {
    const bodies: string[] = []
    await startedRun({
      commentOnPullRequest: async (request) => {
        bodies.push(request.body)
      },
    })

    const ready = bodies.find((body) => body.includes('has finished with this pull request'))

    expect(ready).toContain('- architecture-review: APPROVED')
    expect(ready).toContain('- code-review: APPROVED')
    expect(ready).toContain('- bug-scanner: APPROVED')
    expect(ready).toContain('- coderabbit: REVIEWED')
  })

  it('nudges coderabbit and refuses approval when coderabbit has not reviewed', async () => {
    const comments: string[] = []
    const studio = await factoryFor({
      waitForReviewer: async () => ({
        reviewSeen: false,
        rateLimited: false,
        verdict: null,
        summary: null,
        comments: [],
      }),
      commentOnPullRequest: async (request) => {
        comments.push(request.body)
      },
    })
    const run = await studio.getWorkflow('review-cycle').createRun({ runId: 'review' })

    const finished = await run.start({ inputData: reviewInput() })

    expect(comments[0]).toContain('@coderabbitai please review')
    expect(finished).toStrictEqual(
      expect.objectContaining({
        status: 'success',
        result: expect.objectContaining({ approved: false, coderabbitStatus: 'not-reviewed' }),
      }),
    )
  })

  it('fails rather than finishing when coderabbit never reviewed', async () => {
    const bodies: string[] = []
    const { started } = await startedRun({
      waitForReviewer: async () => ({
        reviewSeen: false,
        rateLimited: false,
        verdict: null,
        summary: null,
        comments: [],
      }),
      commentOnPullRequest: async (request) => {
        bodies.push(request.body)
      },
    })

    expect(started).toStrictEqual(
      expect.objectContaining({
        status: 'failed',
        error: expect.objectContaining({
          message: expect.stringContaining('Coderabbit did not review'),
        }),
      }),
    )
    expect(bodies.some((body) => body.includes('has finished with this pull request'))).toBe(false)
  })

  it('fails when coderabbit requests changes without a summary', async () => {
    const studio = await factoryFor({
      waitForReviewer: async () => ({
        reviewSeen: true,
        rateLimited: false,
        verdict: 'changes-requested',
        summary: null,
        comments: [],
      }),
    })
    const run = await studio.getWorkflow('review-cycle').createRun({ runId: 'review' })

    const finished = await run.start({ inputData: reviewInput() })

    expect(finished).toStrictEqual(
      expect.objectContaining({
        status: 'failed',
        error: expect.objectContaining({
          message: expect.stringContaining('no summary to address'),
        }),
      }),
    )
  })

  it('gives the coderabbit change request to the implementer', async () => {
    const feedbackPrompts: string[] = []
    await startedRun({
      waitForReviewer: async () => ({
        reviewSeen: true,
        rateLimited: false,
        verdict: 'changes-requested',
        summary: 'Move AI client construction to the shell.',
        comments: [],
      }),
      generate: async (request) => {
        if (request.prompt.startsWith('Here is the feedback')) {
          feedbackPrompts.push(request.prompt)
        }
        return stubs().generate(request)
      },
    })

    expect(feedbackPrompts.join('\n')).toContain('Move AI client construction to the shell.')
  })

  it('does not approve when coderabbit rate limited the pull request', async () => {
    const studio = await factoryFor({
      waitForReviewer: async () => ({
        reviewSeen: true,
        rateLimited: true,
        verdict: null,
        summary: null,
        comments: [],
      }),
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

  it('reports coderabbit as skipped when it was rate limited at the end', async () => {
    const bodies: string[] = []
    await startedRun({
      waitForReviewer: async () => ({
        reviewSeen: true,
        rateLimited: true,
        verdict: null,
        summary: null,
        comments: [],
      }),
      closeReviewCycle: async (request) => ({
        cycleNumber: request.cycleNumber,
        statuses: Object.fromEntries(
          request.verdicts.map((verdict) => [verdict.reviewer, verdict.status]),
        ),
        reviewersToRun: [],
        reviewersLeftOut: [],
        limitReached: true,
      }),
      commentOnPullRequest: async (request) => {
        bodies.push(request.body)
      },
    })

    const ready = bodies.find((body) => body.includes('has finished with this pull request'))

    expect(ready).toContain('- coderabbit: SKIPPED - RATE LIMITED')
  })

  it('reports a reviewer that did not run', async () => {
    const bodies: string[] = []
    await startedRun({
      closeReviewCycle: async (request) => ({
        cycleNumber: request.cycleNumber,
        statuses: { 'architecture-review': 'APPROVED' },
        reviewersToRun: [],
        reviewersLeftOut: [],
        limitReached: true,
      }),
      commentOnPullRequest: async (request) => {
        bodies.push(request.body)
      },
    })

    const ready = bodies.find((body) => body.includes('has finished with this pull request'))

    expect(ready).toContain('- architecture-review: APPROVED')
    expect(ready).toContain('- code-review: DID_NOT_RUN')
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
                outcome: 'complete',
                allWorkCommitted: true,
                resolutions: [
                  { commentId: 1, outcome: 'addressed', response: 'Fixed the naming.' },
                  { commentId: 2, outcome: 'partly-addressed', response: 'Left the actor alone.' },
                  { commentId: 3, outcome: 'not-addressed', response: 'Conflicts with ADR-002.' },
                  { commentId: 9, outcome: 'addressed', response: 'Answered the comment.' },
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
        verdict: 'approved',
        summary: null,
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

    expect(replies).toStrictEqual([
      { commentId: 1, body: '[dev-workflow-v3] [cycle 1] Fixed the naming.' },
      { commentId: 2, body: '[dev-workflow-v3] [cycle 1] Left the actor alone.' },
      { commentId: 3, body: '[dev-workflow-v3] [cycle 1] Conflicts with ADR-002.' },
      { commentId: 9, body: '[dev-workflow-v3] [cycle 1] Answered the comment.' },
    ])
  })

  it('answers a finding without listing files when nothing changed since the cycle began', async () => {
    const replies: string[] = []
    const studio = await factoryFor({
      generate: async (request) =>
        request.prompt.startsWith('Here is the feedback')
          ? {
              object: {
                outcome: 'complete',
                allWorkCommitted: true,
                resolutions: [{ commentId: 1, outcome: 'addressed', response: 'Addressed.' }],
              },
              text: '',
              finishReason: 'stop',
              suspendPayload: null,
            }
          : stubs().generate(request),
      waitForReviewer: async () => ({
        reviewSeen: true,
        rateLimited: false,
        verdict: 'approved',
        summary: null,
        comments: [],
      }),
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

    expect(replies).toStrictEqual(['[dev-workflow-v3] [cycle 1] Addressed.'])
  })

  it('suspends when the agent does not answer every finding', async () => {
    const studio = await factoryFor({
      generate: async (request) =>
        request.prompt.startsWith('Here is the feedback')
          ? {
              object: {
                outcome: 'complete',
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

  it('suspends for the person when the feedback agent asks a question', async () => {
    const feedbackPrompts: string[] = []
    const studio = await factoryFor({
      generate: async (request) => {
        if (!request.prompt.startsWith('Here is the feedback')) return stubs().generate(request)
        feedbackPrompts.push(request.prompt)
        return feedbackPrompts.length === 1
          ? {
              object: undefined,
              text: '',
              finishReason: 'suspended',
              suspendPayload: { question: 'Which port?' },
            }
          : stubs().generate(request)
      },
    })
    const run = await studio.getWorkflow('review-cycle').createRun({ runId: 'review' })

    const finished = await run.start({
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

    expect(finished).toStrictEqual(
      expect.objectContaining({
        status: 'suspended',
        steps: expect.objectContaining({
          'address-feedback': expect.objectContaining({
            suspendPayload: expect.objectContaining({
              reason: 'Which port?',
              unaddressed: [],
            }),
          }),
        }),
      }),
    )

    await run.resume({ step: 'address-feedback', resumeData: { answer: 'Use port X.' } })

    expect(feedbackPrompts[1]).toContain('The person answered: Use port X.')
    expect(feedbackPrompts[1]).not.toContain('You asked:')
  })

  it('passes the asked question back when the person answers a feedback question', async () => {
    const feedbackPrompts: string[] = []
    const studio = await factoryFor({
      generate: async (request) => {
        if (!request.prompt.startsWith('Here is the feedback')) return stubs().generate(request)
        feedbackPrompts.push(request.prompt)
        return feedbackPrompts.length === 1
          ? {
              object: undefined,
              text: '',
              finishReason: 'suspended',
              suspendPayload: { question: 'Which port?' },
            }
          : stubs().generate(request)
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

    await run.resume({
      step: 'address-feedback',
      resumeData: { answer: 'Use port X.', question: 'Which port?' },
    })

    expect(feedbackPrompts[1]).toContain('You asked: Which port?')
    expect(feedbackPrompts[1]).toContain('The person answered: Use port X.')
  })

  it('fails when the feedback agent runs out of time', async () => {
    const studio = await factoryFor({
      generate: async (request) =>
        request.prompt.startsWith('Here is the feedback')
          ? { object: undefined, text: '', finishReason: 'aborted', suspendPayload: null }
          : stubs().generate(request),
    })
    const run = await studio.getWorkflow('review-cycle').createRun({ runId: 'review' })

    const finished = await run.start({
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

    expect(finished.status).toBe('failed')
  })

  it('fails when the feedback agent runs out of steps', async () => {
    const studio = await factoryFor({
      generate: async (request) =>
        request.prompt.startsWith('Here is the feedback')
          ? { object: undefined, text: '', finishReason: 'tool-calls', suspendPayload: null }
          : stubs().generate(request),
    })
    const run = await studio.getWorkflow('review-cycle').createRun({ runId: 'review' })

    const finished = await run.start({
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

    expect(finished.status).toBe('failed')
  })

  it('suspends with the reason when the feedback is answered but the tree is not committed', async () => {
    const studio = await factoryFor({
      generate: async (request) =>
        request.prompt.startsWith('Here is the feedback') ||
        request.prompt.startsWith('You are not finished')
          ? {
              object: {
                resolutions: [{ commentId: 1, outcome: 'addressed', response: 'Done.' }],
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
              unaddressed: [],
              reason: expect.stringContaining('It answered every finding.'),
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

  it('stops the cycle when the implementer is blocked while addressing feedback', async () => {
    const studio = await factoryFor({
      generate: async (request) =>
        request.prompt.startsWith('Here is the feedback')
          ? {
              object: {
                summary: 'blocked',
                blockedReason: 'The rule conflicts with the ADR.',
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
        verdict: 'approved',
        summary: null,
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
