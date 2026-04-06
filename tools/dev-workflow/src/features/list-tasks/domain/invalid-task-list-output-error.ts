/** @riviere-role domain-error */
export class InvalidTaskListOutputError extends Error {
  constructor(zodMessage: string) {
    super('Invalid task list output: ' + zodMessage)
    this.name = 'InvalidTaskListOutputError'
    Error.captureStackTrace?.(this, this.constructor)
  }
}
