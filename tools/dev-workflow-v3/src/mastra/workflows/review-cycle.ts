import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import type { Agent } from '@mastra/core/agent'
import {
  PullRequestReference,
  ReviewFinding,
  Reviewer,
  ReviewerStatus,
  ReviewerStatuses,
  ReviewVerdict,
  WorktreeReference,
} from '@living-architecture/dev-workflow-v3-domain-model'
import type { ReadPullRequestDiff } from '@living-architecture/dev-workflow-v3-use-cases/commands/read-pull-request-diff'
import type { PublishReviewFindings } from '@living-architecture/dev-workflow-v3-use-cases/commands/publish-review-findings'
import type { CloseReviewCycle } from '@living-architecture/dev-workflow-v3-use-cases/commands/close-review-cycle'
import type { VerifyWork } from '@living-architecture/dev-workflow-v3-use-cases/commands/verify-work'
import type { CommitWork } from '@living-architecture/dev-workflow-v3-use-cases/commands/commit-work'
import type { PushBranch } from '@living-architecture/dev-workflow-v3-use-cases/commands/push-branch'
import type { WaitForReviewer } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/wait-for-reviewer'

const REVIEWERS = ['architecture-review', 'code-review', 'bug-scanner'] as const

type ReviewerName = (typeof REVIEWERS)[number]

const findingSchema = z.object({
  reviewer: z.string(),
  file: z.string(),
  line: z.number().int().positive(),
  rule: z.string().nullable(),
  summary: z.string(),
})

/** @riviere-role workflow-definition */
export const reviewLoopStateSchema = z.object({
  runId: z.string(),
  model: z.string(),
  issueNumber: z.number().int().positive(),
  pullRequestNumber: z.number().int().positive(),
  worktreePath: z.string(),
  branch: z.string(),
  cycleNumber: z.number().int().positive(),
  reviewerStatuses: z.record(z.string(), z.string()),
  findings: z.array(findingSchema),
  approved: z.boolean(),
  limitReached: z.boolean(),
  readyForHuman: z.boolean().default(false),
})

type ReviewLoopState = z.infer<typeof reviewLoopStateSchema>

const reviewerOutputSchema = z.object({
  status: z.enum(['APPROVED', 'OPEN_FEEDBACK']),
  findings: z.array(
    z.object({
      file: z.string(),
      line: z.number().int().positive(),
      rule: z.string().nullable(),
      summary: z.string(),
    }),
  ),
})

type ReviewCycleDependencies = {
  readonly readDiff: ReadPullRequestDiff
  readonly publishFindings: PublishReviewFindings
  readonly closeCycle: CloseReviewCycle
  readonly waitForReviewer: WaitForReviewer
  readonly verifyWork: VerifyWork
  readonly commitWork: CommitWork
  readonly pushBranch: PushBranch
  readonly readGuidance: () => Promise<string>
  readonly reviewerFor: (
    reviewer: ReviewerName,
    model: string,
    worktreePath: string,
  ) => Promise<Agent>
  readonly implementerFor: (model: string, worktreePath: string) => Agent
}

/**
 * @riviere-role workflow-definition
 */
export function createReviewCycleWorkflow(dependencies: ReviewCycleDependencies) {
  const review = (reviewer: ReviewerName) =>
    createStep({
      id: reviewer,
      inputSchema: reviewLoopStateSchema,
      outputSchema: reviewLoopStateSchema,
      execute: async ({ inputData }) => {
        if (inputData.reviewerStatuses[reviewer] === 'APPROVED') return { ...inputData }
        const { diff } = await dependencies.readDiff.execute({
          pullRequest: pullRequestOf(inputData),
        })
        const reviewerAgent = await dependencies.reviewerFor(
          reviewer,
          inputData.model,
          inputData.worktreePath,
        )
        const response = await reviewerAgent.generate(
          [
            `Review pull request ${inputData.pullRequestNumber}.`,
            inputData.reviewerStatuses[reviewer] === 'OPEN_FEEDBACK'
              ? 'You raised findings before. Say whether they are fixed.'
              : 'This is your first review of this change.',
            '',
            'Diff:',
            diff,
          ].join('\n'),
          { structuredOutput: { schema: reviewerOutputSchema } },
        )
        const verdict = ReviewVerdict.parse({
          reviewer,
          status: response.object.status,
          findings: response.object.findings,
        })
        return {
          ...inputData,
          reviewerStatuses: {
            ...inputData.reviewerStatuses,
            [reviewer]: verdict.status().name(),
          },
          findings: [...inputData.findings, ...verdict.findings().map(toPlainFinding)],
        }
      },
    })

  const collectVerdicts = createStep({
    id: 'collect-verdicts',
    inputSchema: reviewLoopStateSchema,
    outputSchema: reviewLoopStateSchema,
    execute: async ({ inputData }) => {
      const verdicts = REVIEWERS.map((reviewer) => verdictOf(reviewer, inputData)).filter(
        (verdict): verdict is ReviewVerdict => verdict !== undefined,
      )
      const result = dependencies.closeCycle.execute({
        cycleNumber: inputData.cycleNumber,
        statuses: statusesOf(inputData),
        verdicts,
      })
      return {
        ...inputData,
        reviewerStatuses: statusesOf(inputData).toJSON(),
        approved: inputData.findings.length === 0,
        limitReached: result.limitReached,
      }
    },
  })

  const publishReviewFindings = createStep({
    id: 'publish-review-findings',
    inputSchema: reviewLoopStateSchema,
    outputSchema: reviewLoopStateSchema,
    execute: async ({ inputData }) => {
      await dependencies.publishFindings.execute({
        pullRequest: pullRequestOf(inputData),
        findings: inputData.findings
          .filter((finding) => finding.reviewer !== 'coderabbit')
          .map(findingsOf),
      })
      return { ...inputData }
    },
  })

  const waitForCodeRabbit = createStep({
    id: 'wait-for-coderabbit',
    inputSchema: reviewLoopStateSchema,
    outputSchema: reviewLoopStateSchema,
    execute: async ({ inputData }) => {
      const feedback = await dependencies.waitForReviewer({
        pullRequestNumber: inputData.pullRequestNumber,
      })
      return {
        ...inputData,
        approved: inputData.approved && !feedback.rateLimited,
        findings: [
          ...inputData.findings,
          ...feedback.comments.map((comment) => ({
            reviewer: 'coderabbit',
            file: comment.path,
            line: comment.line,
            rule: null,
            summary: comment.body.slice(0, 500),
          })),
        ],
      }
    },
  })

  const addressFeedback = createStep({
    id: 'address-feedback',
    inputSchema: reviewLoopStateSchema,
    outputSchema: reviewLoopStateSchema,
    execute: async ({ inputData }) => {
      if (inputData.findings.length === 0) return { ...inputData }
      await dependencies
        .implementerFor(inputData.model, inputData.worktreePath)
        .generate(
          [
            'Address the review findings below in this workspace.',
            'Fix each one, or say in your summary why it does not apply.',
            'Do not push and do not open a pull request.',
            '',
            'Findings:',
            inputData.findings
              .map((finding) => `- ${finding.file}:${finding.line} ${finding.summary}`)
              .join('\n'),
            '',
            'Repository guidance:',
            await dependencies.readGuidance(),
          ].join('\n'),
          { maxSteps: 40, autoResumeSuspendedTools: true },
        )
      return { ...inputData }
    },
  })

  const verifyAndCommit = createStep({
    id: 'verify-and-commit',
    inputSchema: reviewLoopStateSchema,
    outputSchema: reviewLoopStateSchema,
    execute: async ({ inputData }) => {
      const worktree = worktreeOf(inputData)
      const { verification } = await dependencies.verifyWork.execute({ worktree })
      if (!verification.isGreen()) {
        throw new RunFailed(
          `The checks failed after addressing feedback: ${verification
            .failures()
            .map((check) => check.name())
            .join(', ')}`,
        )
      }
      await dependencies.commitWork.execute({
        worktree,
        message: `fix: address review feedback in cycle ${inputData.cycleNumber}`,
      })
      await dependencies.pushBranch.execute({ worktree })
      return {
        ...inputData,
        cycleNumber: inputData.cycleNumber + (inputData.approved ? 0 : 1),
        findings: [],
      }
    },
  })

  return createWorkflow({
    id: 'review-cycle',
    inputSchema: reviewLoopStateSchema,
    outputSchema: reviewLoopStateSchema,
  })
    .then(review('architecture-review'))
    .then(review('code-review'))
    .then(review('bug-scanner'))
    .then(collectVerdicts)
    .then(publishReviewFindings)
    .then(waitForCodeRabbit)
    .then(addressFeedback)
    .then(verifyAndCommit)
    .commit()
}

/** @riviere-role domain-error */
class RunFailed extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RunFailed'
  }
}

function pullRequestOf(state: ReviewLoopState): PullRequestReference {
  return PullRequestReference.from({
    number: state.pullRequestNumber,
    url: `https://github.com/pull/${state.pullRequestNumber}`,
  })
}

function worktreeOf(state: ReviewLoopState): WorktreeReference {
  return WorktreeReference.from({ path: state.worktreePath, branch: state.branch })
}

function statusesOf(state: ReviewLoopState): ReviewerStatuses {
  const known = REVIEWERS.filter((reviewer) => state.reviewerStatuses[reviewer] !== undefined)
  if (known.length === 0) {
    return ReviewerStatuses.fromInitialState(
      REVIEWERS.map((reviewer) => Reviewer.fromName(reviewer)),
      ReviewerStatus.parse('PENDING'),
    )
  }
  return ReviewerStatuses.parse(state.reviewerStatuses)
}

function verdictOf(reviewer: ReviewerName, state: ReviewLoopState): ReviewVerdict | undefined {
  const status = state.reviewerStatuses[reviewer]
  if (status === 'PENDING' || status === undefined) return undefined
  return ReviewVerdict.parse({
    reviewer,
    status,
    findings: state.findings
      .filter((finding) => finding.reviewer === reviewer)
      .map((finding) => ({
        file: finding.file,
        line: finding.line,
        rule: finding.rule,
        summary: finding.summary,
      })),
  })
}

function findingsOf(finding: z.infer<typeof findingSchema>): ReviewFinding {
  return ReviewFinding.parse({
    reviewer: Reviewer.fromName(finding.reviewer),
    file: finding.file,
    line: finding.line,
    rule: finding.rule,
    summary: finding.summary,
  })
}

function toPlainFinding(finding: ReviewFinding): z.infer<typeof findingSchema> {
  return {
    reviewer: finding.reviewer().name(),
    file: finding.file(),
    line: finding.line(),
    rule: finding.rule(),
    summary: finding.summary(),
  }
}
