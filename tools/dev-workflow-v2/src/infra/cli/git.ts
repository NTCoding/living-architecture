import { execSync } from 'node:child_process'
import type { GitInfo } from '@ntcoding/agentic-workflow-builder/dsl'

/* v8 ignore start */
export function getGitInfo(): GitInfo {
  const defaultBranch = detectDefaultBranch()
  return {
    currentBranch: runGit('rev-parse --abbrev-ref HEAD'),
    workingTreeClean: runGit('status --porcelain').length === 0,
    headCommit: runGit('rev-parse HEAD'),
    changedFilesVsDefault: runGit(`diff --name-only ${defaultBranch} HEAD`)
      .split('\n')
      .filter((f: string) => f.length > 0),
    hasCommitsVsDefault: runGit(`rev-list HEAD ^${defaultBranch}`).length > 0,
  }
}

function detectDefaultBranch(): string {
  try {
    return runGit('symbolic-ref refs/remotes/origin/HEAD --short').replace('origin/', '')
  } catch {
    return 'main'
  }
}

function runGit(gitArgs: string): string {
  return execSync(`git ${gitArgs}`, { encoding: 'utf-8' }).trim()
}

export function runGh(ghArgs: string): string {
  return execSync(`gh ${ghArgs}`, { encoding: 'utf-8' })
}
/* v8 ignore stop */
