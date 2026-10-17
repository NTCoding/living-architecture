import { createStep, createWorkflow } from '@mastra/core/workflows'
import type { Agent } from '@mastra/core/agent'
import { z } from 'zod'
import {
  ImplementationOutcome,
  ImplementationPlan,
  IssueNumber,
  IssueReference,
  PlanApproval,
  PullRequestDraft,
  WorktreeReference,
} from '@living-architecture/dev-workflow-v3-domain-model'
import type { ReadIssue } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/read-issue'
import type { InstallDependencies } from '@living-architecture/dev-workflow-v3-use-cases/commands/install-dependencies'
import type { PrepareBranch } from '@living-architecture/dev-workflow-v3-use-cases/commands/prepare-branch'
import type { VerifyWork } from '@living-architecture/dev-workflow-v3-use-cases/commands/verify-work'
import type { CommitWork } from '@living-architecture/dev-workflow-v3-use-cases/commands/commit-work'
import type { PushBranch } from '@living-architecture/dev-workflow-v3-use-cases/commands/push-branch'
import type { OpenPullRequest } from '@living-architecture/dev-workflow-v3-use-cases/commands/open-pull-request'

const runStateSchema = z.object({
  issueNumber: z.number().int().positive(),
  model: z.string(),
  worktreesDirectory: z.string(),
  issueTitle: z.string().default(''),
  issueBody: z.string().default(''),
  worktreePath: z.string().default(''),
  branch: z.string().default(''),
  planMarkdown: z.string().default(''),
  planApproved: z.boolean().default(false),
  implementationSummary: z.string().default(''),
  verificationGreen: z.boolean().default(false),
  commitSha: z.string().default(''),
  pullRequestNumber: z.number().int().positive().default(1),
  pullRequestUrl: z.string().default(''),
  cycleNumber: z.number().int().positive().default(1),
  readyForHuman: z.boolean().default(false),
})

type RunState = z.infer<typeof runStateSchema>

/** @riviere-role domain-error */
class RunFailed extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RunFailed'
  }
}

const startInputSchema = z.object({
  issueNumber: z.number().int().positive(),
  model: z.string(),
  worktreesDirectory: z.string(),
})

const planApprovalResumeSchema = z.object({
  approved: z.boolean(),
  notes: z.string().nullable(),
})

const planOutputSchema = z.object({ markdown: z.string().min(1) })

const implementationOutputSchema = z.object({
  summary: z.string().min(1),
  blockedReason: z.string().nullable(),
})

type StartImplementationDependencies = {
  readonly readIssue: ReadIssue
  readonly readGuidance: () => Promise<string>
  readonly plannerFor: (model: string) => Agent
  readonly implementerFor: (model: string, worktreePath: string) => Agent
  readonly prepareBranch: PrepareBranch
  readonly installDependencies: InstallDependencies
  readonly verifyWork: VerifyWork
  readonly commitWork: CommitWork
  readonly pushBranch: PushBranch
  readonly openPullRequest: OpenPullRequest
}

/**
 * The graph a developer starts. Deterministic first: of the fourteen steps, only
 * three call a model, and those three are stubbed until slice 4.
 * @riviere-role workflow-definition
 */
export function createStartImplementationWorkflow(dependencies: StartImplementationDependencies) {
  const loadIssue = createStep({
    id: 'load-issue',
    inputSchema: startInputSchema,
    outputSchema: runStateSchema,
    execute: async ({ inputData }) => {
      const issue = await dependencies.readIssue(inputData.issueNumber)
      return { ...runStateSchema.parse(inputData), issueTitle: issue.title, issueBody: issue.body }
    },
  })

  const prepareBranch = createStep({
    id: 'prepare-branch',
    inputSchema: runStateSchema,
    outputSchema: runStateSchema,
    execute: async ({ inputData }) => {
      const issue = IssueReference.from({
        number: IssueNumber.parse(inputData.issueNumber),
        title: inputData.issueTitle,
        body: inputData.issueBody,
      })
      const { worktree } = await dependencies.prepareBranch.execute({
        issue,
        worktreesDirectory: inputData.worktreesDirectory,
      })
      return { ...inputData, worktreePath: worktree.path(), branch: worktree.branch() }
    },
  })

  // A fresh worktree has no installed dependencies, so the checks cannot run yet.
  const installDependencies = createStep({
    id: 'install-dependencies',
    inputSchema: runStateSchema,
    outputSchema: runStateSchema,
    execute: async ({ inputData }) => {
      await dependencies.installDependencies.execute({ worktree: worktreeOf(inputData) })
      return { ...inputData }
    },
  })

  const readGuidance = createStep({
    id: 'read-guidance',
    inputSchema: runStateSchema,
    outputSchema: runStateSchema,
    execute: async ({ inputData }) => ({ ...inputData }),
  })

  const draftPlan = createStep({
    id: 'draft-plan',
    inputSchema: runStateSchema,
    outputSchema: runStateSchema,
    execute: async ({ inputData }) => {
      const guidance = await dependencies.readGuidance()
      const response = await dependencies
        .plannerFor(inputData.model)
        .generate(
          [
            `Issue ${inputData.issueNumber}: ${inputData.issueTitle}`,
            '',
            inputData.issueBody,
            '',
            'Repository guidance:',
            guidance,
          ].join('\n'),
          { structuredOutput: { schema: planOutputSchema } },
        )
      return {
        ...inputData,
        planMarkdown: ImplementationPlan.parse(response.object.markdown).markdown(),
      }
    },
  })

  const requestPlanApproval = createStep({
    id: 'request-plan-approval',
    inputSchema: runStateSchema,
    outputSchema: runStateSchema,
    resumeSchema: planApprovalResumeSchema,
    suspendSchema: planApprovalResumeSchema,
    execute: async ({ inputData, resumeData, suspend }) => {
      if (resumeData === undefined) {
        return suspend({ approved: false, notes: inputData.planMarkdown })
      }
      const approval = PlanApproval.from(resumeData)
      if (!approval.isApproved()) {
        throw new RunFailed('The plan was rejected, so the run stops here.')
      }
      return { ...inputData, planApproved: true }
    },
  })

  const implement = createStep({
    id: 'implement',
    inputSchema: runStateSchema,
    outputSchema: runStateSchema,
    execute: async ({ inputData }) => {
      const response = await dependencies
        .implementerFor(inputData.model, inputData.worktreePath)
        .generate(
          [
            `Implement issue ${inputData.issueNumber} in this workspace.`,
            '',
            'Plan:',
            inputData.planMarkdown,
            '',
            'Repository guidance:',
            await dependencies.readGuidance(),
          ].join('\n'),
          {
            structuredOutput: { schema: implementationOutputSchema },
            maxSteps: 60,
            memory: {
              thread: `issue-${inputData.issueNumber}`,
              resource: 'factory',
            },
            autoResumeSuspendedTools: true,
          },
        )
      const outcome = ImplementationOutcome.from(response.object)
      if (outcome.isBlocked()) {
        throw new RunFailed(`The implementer is blocked: ${outcome.reason()}`)
      }
      return { ...inputData, implementationSummary: outcome.summary() }
    },
  })

  const verify = createStep({
    id: 'verify',
    inputSchema: runStateSchema,
    outputSchema: runStateSchema,
    execute: async ({ inputData }) => {
      const verification = await dependencies.verifyWork.execute({
        worktree: worktreeOf(inputData),
      })
      if (!verification.verification.isGreen()) {
        throw new RunFailed(
          `The checks failed: ${verification.verification
            .failures()
            .map((check) => check.name())
            .join(', ')}`,
        )
      }
      return { ...inputData, verificationGreen: true }
    },
  })

  const commitWork = createStep({
    id: 'commit-work',
    inputSchema: runStateSchema,
    outputSchema: runStateSchema,
    execute: async ({ inputData }) => {
      const { commit } = await dependencies.commitWork.execute({
        worktree: worktreeOf(inputData),
        message: `feat: ${inputData.issueTitle.toLowerCase()}`,
      })
      return { ...inputData, commitSha: commit.sha() }
    },
  })

  const pushBranch = createStep({
    id: 'push-branch',
    inputSchema: runStateSchema,
    outputSchema: runStateSchema,
    execute: async ({ inputData }) => {
      await dependencies.pushBranch.execute({ worktree: worktreeOf(inputData) })
      return { ...inputData }
    },
  })

  // Stub for slice 4. The model writes the title and the description from the diff.
  const draftPullRequest = createStep({
    id: 'draft-pull-request',
    inputSchema: runStateSchema,
    outputSchema: runStateSchema,
    execute: async ({ inputData }) => ({ ...inputData }),
  })

  const validatePullRequest = createStep({
    id: 'validate-pull-request',
    inputSchema: runStateSchema,
    outputSchema: runStateSchema,
    execute: async ({ inputData }) => {
      PullRequestDraft.parse({
        title: pullRequestTitle(inputData),
        description: pullRequestDescription(inputData),
      })
      return { ...inputData }
    },
  })

  const openPullRequest = createStep({
    id: 'open-pull-request',
    inputSchema: runStateSchema,
    outputSchema: runStateSchema,
    execute: async ({ inputData }) => {
      const { pullRequest } = await dependencies.openPullRequest.execute({
        worktree: worktreeOf(inputData),
        draft: PullRequestDraft.parse({
          title: pullRequestTitle(inputData),
          description: pullRequestDescription(inputData),
        }),
      })
      return {
        ...inputData,
        pullRequestNumber: pullRequest.number(),
        pullRequestUrl: pullRequest.url(),
      }
    },
  })

  // Stub for slice 5. The review cycle workflow replaces this step.
  const reviewCycle = createStep({
    id: 'review-cycle',
    inputSchema: runStateSchema,
    outputSchema: runStateSchema,
    execute: async ({ inputData }) => ({ ...inputData, cycleNumber: inputData.cycleNumber + 1 }),
  })

  const markReadyForHuman = createStep({
    id: 'mark-ready-for-human',
    inputSchema: runStateSchema,
    outputSchema: runStateSchema,
    execute: async ({ inputData }) => ({ ...inputData, readyForHuman: true }),
  })

  return createWorkflow({
    id: 'start-implementation',
    inputSchema: startInputSchema,
    outputSchema: runStateSchema,
  })
    .then(loadIssue)
    .then(prepareBranch)
    .then(installDependencies)
    .then(readGuidance)
    .then(draftPlan)
    .then(requestPlanApproval)
    .then(implement)
    .then(verify)
    .then(commitWork)
    .then(pushBranch)
    .then(draftPullRequest)
    .then(validatePullRequest)
    .then(openPullRequest)
    .then(reviewCycle)
    .then(markReadyForHuman)
    .commit()
}

function worktreeOf(state: RunState): WorktreeReference {
  return WorktreeReference.from({ path: state.worktreePath, branch: state.branch })
}

function pullRequestTitle(state: RunState): string {
  return `feat: ${state.issueTitle.toLowerCase()}`
}

function pullRequestDescription(state: RunState): string {
  return [
    '## Problem',
    '',
    state.issueBody,
    '',
    '## Change',
    '',
    state.implementationSummary,
    '',
    `Closes #${state.issueNumber}.`,
  ].join('\n')
}
