import {
  branchNameForIssue,
  parseIssueNumber,
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
import { resolveWorkspaceRoot, runCommand, runOrThrow } from './maintainer-git-execution.ts'
import { CommandFailed, NoCommitsAhead, WorkingTreeDirty } from './maintainer-git-errors.ts'
import type { BehaviourContext, MethodResult } from './maintainer-git-schema.ts'

const REMOTE = 'origin'
const BASE = 'main'

export async function prepareIssue(
  args: { issue: string },
  context: BehaviourContext,
): Promise<MethodResult> {
  const root = await resolveWorkspaceRoot(context.signal)
  const issue = parseIssueNumber(args.issue)
  const branch = branchNameForIssue(issue)

  await runOrThrow(planFetch(REMOTE), context.signal, 'git fetch', root)

  const existing = await runCommand(planCheckBranchExists(branch), context.signal, root)
  const created = existing.exitCode !== 0
  if (created) {
    await runOrThrow(
      planCreateBranch(branch, `${REMOTE}/${BASE}`),
      context.signal,
      'git switch --create',
      root,
    )
  } else {
    await runOrThrow(planSwitchBranch(branch), context.signal, 'git switch', root)
  }

  const dirty = await runOrThrow(planStatus(), context.signal, 'git status', root)
  if (dirty.stdout !== '') {
    throw new WorkingTreeDirty('before starting work', dirty.stdout)
  }

  const handle = await context.writeResource('workspace', 'workspace', {
    branch,
    base: BASE,
    issue,
    created,
  })
  context.logger.info(`prepared ${branch} from ${REMOTE}/${BASE}`)
  return { dataHandles: [handle] }
}

export async function commit(
  args: { message: string },
  context: BehaviourContext,
): Promise<MethodResult> {
  const root = await resolveWorkspaceRoot(context.signal)

  await runOrThrow(planStageAll(), context.signal, 'git add', root)
  await runOrThrow(planCommit(args.message), context.signal, 'git commit', root)

  const sha = await runOrThrow(planHeadSha(), context.signal, 'git rev-parse', root)
  const status = await runOrThrow(planStatus(), context.signal, 'git status', root)
  if (status.stdout !== '') {
    throw new WorkingTreeDirty('after committing', status.stdout)
  }

  const ahead = await runOrThrow(
    planCommitsAhead(`${REMOTE}/${BASE}`),
    context.signal,
    'git rev-list',
    root,
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

export async function runChecks(
  _args: Record<string, never>,
  context: BehaviourContext,
): Promise<MethodResult> {
  const root = await resolveWorkspaceRoot(context.signal)
  const outcome = await runCommand(planVerify(), context.signal, root)
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
