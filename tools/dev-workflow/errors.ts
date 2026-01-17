export class GitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GitError'
    Error.captureStackTrace?.(this, this.constructor)
  }
}

export class GitHubError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GitHubError'
    Error.captureStackTrace?.(this, this.constructor)
  }
}

export class WorkflowError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkflowError'
    Error.captureStackTrace?.(this, this.constructor)
  }
}

export class AgentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AgentError'
    Error.captureStackTrace?.(this, this.constructor)
  }
}
