export class GitHubUnavailableTestError extends Error {
  constructor() {
    super('GitHub unavailable')
    this.name = 'GitHubUnavailableTestError'
  }
}

export class GitUnavailableTestError extends Error {
  constructor() {
    super('Git unavailable')
    this.name = 'GitUnavailableTestError'
  }
}
