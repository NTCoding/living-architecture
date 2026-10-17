import { z } from 'npm:zod@4.3.6'
import {
  AWAIT_REVIEWER_ARGUMENTS,
  CHECKS_RESOURCE,
  COMMIT_ARGUMENTS,
  COMMIT_RESOURCE,
  COMMENT_ARGUMENTS,
  EMPTY_ARGUMENTS,
  POST_FINDINGS_ARGUMENTS,
  ISSUE_ARGUMENTS,
  OPEN_PULL_REQUEST_ARGUMENTS,
  POSTED_FINDINGS_RESOURCE,
  PULL_REQUEST_RESOURCE,
  PUSH_ARGUMENTS,
  PUSH_RESOURCE,
  REVIEWER_RESOURCE,
  WORKSPACE_RESOURCE,
} from './maintainer-git-schema.ts'
import type { BehaviourContext, MethodResult } from './maintainer-git-schema.ts'
import { commit, prepareIssue, runChecks } from './maintainer-git-branch.ts'
import {
  awaitCodeRabbit,
  openPullRequest,
  postComment,
  postFindings,
  pushBranch,
} from './maintainer-git-forge.ts'

export const behavior = {
  type: '@living-architecture/maintainer-git',
  version: '2026.10.17.1',

  globalArguments: z.object({}),

  resources: {
    workspace: {
      description: 'The branch this work item runs on',
      schema: WORKSPACE_RESOURCE,
      lifetime: 'infinite' as const,
      garbageCollection: 20,
    },
    commit: {
      description: 'The commit that was made, and the tree state after it',
      schema: COMMIT_RESOURCE,
      lifetime: 'infinite' as const,
      garbageCollection: 20,
    },
    checks: {
      description: 'The result of the repository verify gate',
      schema: CHECKS_RESOURCE,
      lifetime: 'infinite' as const,
      garbageCollection: 20,
    },
    push: {
      description: 'The branch that was pushed',
      schema: PUSH_RESOURCE,
      lifetime: 'infinite' as const,
      garbageCollection: 20,
    },
    pullRequest: {
      description: 'The pull request this work item produced',
      schema: PULL_REQUEST_RESOURCE,
      lifetime: 'infinite' as const,
      garbageCollection: 20,
    },
    coderabbit: {
      description: "The external reviewer's verdict on the reviewed commit",
      schema: REVIEWER_RESOURCE,
      lifetime: 'infinite' as const,
      garbageCollection: 20,
    },
    postedFindings: {
      description: 'The findings posted to a pull request, inline and general',
      schema: POSTED_FINDINGS_RESOURCE,
      lifetime: 'infinite' as const,
      garbageCollection: 20,
    },
  },

  methods: {
    prepareIssue: {
      description:
        'Fetch the remote, then create or reuse the issue branch from the default branch',
      arguments: ISSUE_ARGUMENTS,
      execute: (args: { issue: string }, context: BehaviourContext): Promise<MethodResult> =>
        prepareIssue(args, context),
    },

    commit: {
      description:
        'Stage everything and commit with the recorded message, then prove the tree is clean and the branch is ahead',
      arguments: COMMIT_ARGUMENTS,
      execute: (args: { message: string }, context: BehaviourContext): Promise<MethodResult> =>
        commit(args, context),
    },

    runChecks: {
      description: 'Run the repository verify gate and record the outcome',
      arguments: EMPTY_ARGUMENTS,
      execute: (args: Record<string, never>, context: BehaviourContext): Promise<MethodResult> =>
        runChecks(args, context),
    },

    pushBranch: {
      description: 'Push the branch and set its upstream',
      arguments: PUSH_ARGUMENTS,
      execute: (args: { branch: string }, context: BehaviourContext): Promise<MethodResult> =>
        pushBranch(args, context),
    },

    openPullRequest: {
      description:
        'Compose the pull request body from the recorded plan and change, then open the pull request',
      arguments: OPEN_PULL_REQUEST_ARGUMENTS,
      execute: (
        args: {
          issue: number
          branch: string
          title: string
          changeSummary: string
          commitMessage: string
          files: string[]
        },
        context: BehaviourContext,
      ): Promise<MethodResult> => openPullRequest(args, context),
    },

    postComment: {
      description: 'Post a single comment on the pull request',
      arguments: COMMENT_ARGUMENTS,
      execute: (
        args: { pr: number; body: string },
        context: BehaviourContext,
      ): Promise<MethodResult> => postComment(args, context),
    },

    postFindings: {
      description:
        'Post every recorded finding, inline where a location was given and as an ordinary comment otherwise',
      arguments: POST_FINDINGS_ARGUMENTS,
      execute: (
        args: {
          pr: number
          headSha: string
          findings: {
            id: string
            severity: 'critical' | 'high' | 'medium' | 'low'
            description: string
            category?: string
          }[]
          locations: { findingId: string; path: string; line: number }[]
        },
        context: BehaviourContext,
      ): Promise<MethodResult> => postFindings(args, context),
    },

    awaitCodeRabbit: {
      description:
        'Poll the pull request until the external reviewer has reviewed the pushed commit',
      arguments: AWAIT_REVIEWER_ARGUMENTS,
      execute: (
        args: {
          pr: number
          headSha: string
          timeoutSeconds: number
          intervalSeconds: number
        },
        context: BehaviourContext,
      ): Promise<MethodResult> => awaitCodeRabbit(args, context),
    },
  },
}
