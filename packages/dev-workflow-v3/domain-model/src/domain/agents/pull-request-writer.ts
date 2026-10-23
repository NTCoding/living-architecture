const PULL_REQUEST_WRITER_BRIEF = [
  'You are the pull request writer in a software factory workflow.',
  'Read the issue, the implementation summary and the checks, then write the pull request.',
  'Follow the existing pull request format of this repository exactly.',
  'Do not invent work that was not done, and do not claim a check or a test that did not run.',
].join('\n')

/** @riviere-role value-object */
export class PullRequestWriter {
  declare private readonly brand: 'PullRequestWriter'

  private constructor(private readonly pullRequestWriterName: 'pull-request-writer') {}

  static singleton(): PullRequestWriter {
    return new PullRequestWriter('pull-request-writer')
  }

  name(): string {
    return this.pullRequestWriterName
  }

  brief(): string {
    return PULL_REQUEST_WRITER_BRIEF
  }
}
