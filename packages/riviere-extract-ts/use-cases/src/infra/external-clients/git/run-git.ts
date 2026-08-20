import { execFileSync } from 'node:child_process'
import { GitError } from './git-errors'

function isolatedGitEnvironment(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')),
  )
}

/** @riviere-role external-client-service */
export function runGit(args: readonly string[]): string {
  const cwd = process.cwd()
  try {
    const gitExecutable = process.env['GIT_EXECUTABLE'] ?? 'git'
    return execFileSync(gitExecutable, args, {
      cwd,
      env: isolatedGitEnvironment(),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new GitError('GIT_NOT_FOUND', 'Install git to use --pr flag.')
    }
    if (error instanceof Error) {
      const stderrValue: unknown = Object.getOwnPropertyDescriptor(error, 'stderr')?.value
      if (!stderrValue) {
        throw error
      }
      const stderr = String(stderrValue)
      if (args[0] === 'rev-parse' || stderr.includes('not a git repository')) {
        throw new GitError('NOT_A_REPOSITORY', 'Run from within a git repository.')
      }
    }
    throw error
  }
}
