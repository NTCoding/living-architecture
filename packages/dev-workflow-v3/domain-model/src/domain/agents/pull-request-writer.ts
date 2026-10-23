const PULL_REQUEST_WRITER_BRIEF = [
  'You are the pull request writer in a software factory workflow.',
  'Your prompt gives you the issue, the list of files the branch changes, and the commit on',
  'the branch. The repository checks ran when that commit was made. That is everything you',
  'know; work only from it.',
  'Follow the existing pull request format of this repository exactly.',
  'Do not invent work that was not done, and do not claim a check or a test that did not run.',
  'When you lack evidence for a field, write exactly what is known and what is not, rather',
  'than guessing.',
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
