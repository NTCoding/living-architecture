type ExtractionDataAccessErrorCode =
  | 'BASE_BRANCH_NOT_FOUND'
  | 'FILE_READ_ERROR'
  | 'GIT_NOT_FOUND'
  | 'NOT_A_REPOSITORY'
  | 'NO_REMOTE'

/** @riviere-role data-access-error */
export class ExtractionDataAccessError extends Error {
  constructor(
    readonly code: ExtractionDataAccessErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'ExtractionDataAccessError'
  }
}
