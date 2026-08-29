export class GitHubUnavailableTestError extends Error {
  constructor() {
    super('GitHub unavailable')
    this.name = 'GitHubUnavailableTestError'
  }
}
