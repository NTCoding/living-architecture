/** @riviere-role cli-error */
export class GitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GitError'
  }
}

/** @riviere-role cli-error */
export class InvalidDraftComponentsFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidEnrichInputError'
  }
}

/** @riviere-role cli-error */
export class MissingSourceFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidExtractInputError'
  }
}
