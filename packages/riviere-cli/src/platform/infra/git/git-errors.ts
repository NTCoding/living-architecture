export type GitErrorCode =
  | 'NOT_A_REPOSITORY'
  | 'GIT_NOT_FOUND'
  | 'NO_REMOTE'
  | 'BASE_BRANCH_NOT_FOUND'

export class GitError extends Error {
  readonly gitErrorCode: GitErrorCode

  constructor(code: GitErrorCode, message: string) {
    super(`[GIT_ERROR] ${code}. ${message}`)
    this.gitErrorCode = code
    this.name = 'GitError'
    Error.captureStackTrace?.(this, this.constructor)
  }
}

export function isGitError(error: unknown): error is GitError {
  return error instanceof GitError
}

/**
 * Extract stderr from an execFileSync error.
 * ANTI-PATTERN EXCEPTION: String-Based Error Detection (AP-001)
 * Justification: git CLI only reports errors via stderr text
 */
export function extractStderr(error: Error): string {
  if (!Object.hasOwn(error, 'stderr')) {
    throw error
  }
  const stderrValue: unknown = Object.getOwnPropertyDescriptor(error, 'stderr')?.value
  if (!stderrValue) {
    throw error
  }
  return String(stderrValue)
}
