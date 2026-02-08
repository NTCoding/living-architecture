import { execFileSync } from 'node:child_process'
import {
  GitError, extractStderr 
} from './git-errors'

class RepositoryUrlParseError extends Error {
  /* v8 ignore start -- @preserve: Error constructor; tested via integration */
  constructor(url: string) {
    super(`Expected owner and repo in git URL, got ${url}`)
    this.name = 'RepositoryUrlParseError'
  }
  /* v8 ignore stop */
}

export interface RepositoryInfo {
  name: string
  owner?: string
  url: string
}

export type GitExecutor = (binary: string, args: readonly string[], cwd: string) => string

/* v8 ignore start -- @preserve: default executor delegates to execFileSync; tested via CLI integration */
function defaultGitExecutor(binary: string, args: readonly string[], cwd: string): string {
  return execFileSync(binary, args, {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim()
}
/* v8 ignore stop */

/* v8 ignore start -- @preserve: git execution; mocked in all integration tests */
function runGit(
  executor: GitExecutor,
  gitBinary: string,
  cwd: string,
  args: readonly string[],
): string {
  try {
    return executor(gitBinary, args, cwd)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new GitError('GIT_NOT_FOUND', 'Install git to detect repository information.')
    }
    if (error instanceof Error) {
      const stderr = extractStderr(error)
      // ANTI-PATTERN EXCEPTION: String-Based Error Detection (AP-001) - git CLI only reports errors via stderr text
      if (stderr.includes('not a git repository')) {
        throw new GitError('NOT_A_REPOSITORY', 'Run from within a git repository.')
      }
    }
    throw error
  }
}
/* v8 ignore stop */

function parseRepositoryUrl(url: string): RepositoryInfo {
  // SSH format: git@github.com:owner/repo.git
  const sshRegex = /^git@[^:]+:([^/]+)\/(.+?)(?:\.git)?$/
  const sshMatch = sshRegex.exec(url)
  if (sshMatch) {
    const [, owner, repo] = sshMatch
    /* v8 ignore start -- @preserve: defensive check; regex ([^/]+) requires non-empty groups */
    if (!owner || !repo) {
      throw new RepositoryUrlParseError(url)
    }
    /* v8 ignore stop */
    return {
      name: `${owner}/${repo}`,
      owner,
      url,
    }
  }

  // HTTPS format: https://github.com/owner/repo.git
  const httpsRegex = /^https?:\/\/[^/]+\/([^/]+)\/(.+?)(?:\.git)?$/
  const httpsMatch = httpsRegex.exec(url)
  if (httpsMatch) {
    const [, owner, repo] = httpsMatch
    /* v8 ignore start -- @preserve: defensive check; regex ([^/]+) requires non-empty groups */
    if (!owner || !repo) {
      throw new RepositoryUrlParseError(url)
    }
    /* v8 ignore stop */
    return {
      name: `${owner}/${repo}`,
      owner,
      url,
    }
  }

  // Fallback: use URL as-is if parsing fails
  return {
    name: url,
    url,
  }
}

/* v8 ignore start -- @preserve: git execution; mocked in all integration tests */
export function getRepositoryInfo(
  gitBinary = 'git',
  cwd = process.cwd(),
  executor: GitExecutor = defaultGitExecutor,
): RepositoryInfo {
  try {
    const url = runGit(executor, gitBinary, cwd, ['remote', 'get-url', 'origin'])
    return parseRepositoryUrl(url)
  } catch (error) {
    if (error instanceof GitError) throw error
    if (error instanceof Error) {
      const stderr = extractStderr(error)
      // ANTI-PATTERN EXCEPTION: String-Based Error Detection (AP-001) - git CLI only reports errors via stderr text
      if (stderr.includes('No such remote')) {
        throw new GitError('NO_REMOTE', 'No git remote named "origin" found.')
      }
    }
    throw error
  }
}
/* v8 ignore stop */
