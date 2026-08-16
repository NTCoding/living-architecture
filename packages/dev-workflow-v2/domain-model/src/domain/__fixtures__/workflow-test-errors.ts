export class WorkflowTestInvariantError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkflowTestInvariantError'
  }
}

export class GitHubUnavailableTestError extends Error {
  constructor() {
    super('GitHub unavailable')
    this.name = 'GitHubUnavailableTestError'
  }
}
