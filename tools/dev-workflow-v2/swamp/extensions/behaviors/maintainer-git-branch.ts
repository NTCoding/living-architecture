import {
  branchNameForIssue,
  planCheckBranchExists,
  planCommit,
  planCommitsAhead,
  planCreateBranch,
  planFetch,
  planHeadSha,
  planStageAll,
  planStatus,
  planSwitchBranch,
  planVerify,
} from './maintainer-git-commands.ts'
import { runCommand, runOrThrow } from './maintainer-git-execution.ts'
import { CommandFailed, NoCommitsAhead, WorkingTreeDirty } from './maintainer-git-errors.ts'
import type { BehaviourContext, MethodResult } from './maintainer-git-schema.ts'

/**
 * The methods that only touch this machine: preparing the branch, committing
 * what the agent wrote, and running the repository gate.
 */

const REMOTE = 'origin'
const BASE = 'main'

/**
 * Fetches the remote, then creates or switches to the issue branch.
 *
 * Refuses to start when the working tree is not clean, because a dirty tree
 * makes it impossible to tell the agent's work apart from work that was already
 * there.
 */
export async function prepareIssue(
  args: { issue: number },
  context: BehaviourContext,
): Promise<MethodResult> {
  const branch = branchNameForIssue(args.issue)
  await runOrThrow(planFetch(REMOTE), context.signal, 'git fetch')

  const existing = await runCommand(planCheckBranchExists(branch), context.signal)
  const created = existing.exitCode !== 0
  if (created) {
    await runOrThrow(
      planCreateBranch(branch, `${REMOTE}/${BASE}`),
      context.signal,
      'git switch --create',
    )
  } else {
    await runOrThrow(planSwitchBranch(branch), context.signal, 'git switch')
  }

  const dirty = await runOrThrow(planStatus(), context.signal, 'git status')
  if (dirty.stdout !== '') {
    throw new WorkingTreeDirty('before starting work', dirty.stdout)
  }

  const handle = await context.writeResource('workspace', 'workspace', {
    branch,
    base: BASE,
    issue: args.issue,
    created,
  })
  context.logger.info(`prepared ${branch} from ${REMOTE}/${BASE}`)
  return { dataHandles: [handle] }
}

/** Stages everything, commits with the recorded message, then proves the result. */
export async function commit(
  args: { message: string },
  context: BehaviourContext,
): Promise<MethodResult> {
  await runOrThrow(planStageAll(), context.signal, 'git add')
  await runOrThrow(planCommit(args.message), context.signal, 'git commit')

  const sha = await runOrThrow(planHeadSha(), context.signal, 'git rev-parse')
  const status = await runOrThrow(planStatus(), context.signal, 'git status')
  if (status.stdout !== '') {
    throw new WorkingTreeDirty('after committing', status.stdout)
  }

  const ahead = await runOrThrow(
    planCommitsAhead(`${REMOTE}/${BASE}`),
    context.signal,
    'git rev-list',
  )
  const commitsAhead = Number.parseInt(ahead.stdout, 10)
  if (!Number.isInteger(commitsAhead) || commitsAhead < 1) {
    throw new NoCommitsAhead(`${REMOTE}/${BASE}`, ahead.stdout)
  }

  const handle = await context.writeResource('commit', 'commit', {
    sha: sha.stdout,
    subject: args.message,
    clean: true,
    commitsAhead,
  })
  context.logger.info(`committed ${sha.stdout}: ${args.message}`)
  return { dataHandles: [handle] }
}

/** Runs the repository verify gate, records the outcome, and fails when it fails. */
export async function runChecks(
  _args: Record<string, never>,
  context: BehaviourContext,
): Promise<MethodResult> {
  const outcome = await runCommand(planVerify(), context.signal)
  const passed = outcome.exitCode === 0
  const handle = await context.writeResource('checks', 'checks', {
    passed,
    exitCode: outcome.exitCode,
    summary: (outcome.stderr || outcome.stdout).slice(-4000),
  })
  if (!passed) {
    context.logger.warn(`pnpm verify failed with exit code ${String(outcome.exitCode)}`)
    throw new CommandFailed('pnpm verify', outcome.exitCode, outcome.stderr || outcome.stdout)
  }
  return { dataHandles: [handle] }
}
