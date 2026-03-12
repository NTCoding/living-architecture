/** @riviere-role external-client-model */
export type GitErrorCode =
  | 'NOT_A_REPOSITORY'
  | 'GIT_NOT_FOUND'
  | 'NO_REMOTE'
  | 'BASE_BRANCH_NOT_FOUND'

/** @riviere-role external-client-error */
export class GitError extends Error {
  readonly gitErrorCode: GitErrorCode

  constructor(code: GitErrorCode, message: string) {
    super(`[GIT_ERROR] ${code}. ${message}`)
    this.gitErrorCode = code
    this.name = 'GitError'
    Error.captureStackTrace?.(this, this.constructor)
  }
}
