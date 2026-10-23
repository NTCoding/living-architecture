const PULL_REQUEST_WRITER_BRIEF = [
  'You are the pull request writer in a software factory workflow.',
  'Your prompt gives you the issue, the list of files the branch changes, and the commit on',
  'the branch. The repository checks ran when that commit was made. That is everything you',
  'know; work only from it.',
  'Do not invent work that was not done, and do not claim a check or a test that did not run.',
  'When you lack evidence for a field, write exactly what is known and what is not, rather',
  'than guessing.',
  'Return exactly this shape and nothing else:',
  '{',
  '  "commitType": "<build, chore, ci, docs, feat, fix, perf, refactor, revert, style or test>",',
  '  "commitScope": "<one lower case word naming the area, 1 to 20 characters>",',
  '  "subject": "<one line, under 50 characters>",',
  '  "description": "<one short paragraph>",',
  '  "problem": "<why the change is needed, in the words of the issue>",',
  '  "acceptanceCriteria": ["<the criteria from the issue>"],',
  '  "keyChanges": ["<the files and what changed in them>"],',
  '  "architectureImpact": "<what a reviewer should know, or None>",',
  '  "validation": "<what was run and what it reported>",',
  '  "notes": "<anything else the reviewer needs, or None>"',
  '}',
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
