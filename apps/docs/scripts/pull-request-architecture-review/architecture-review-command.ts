import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { compareArchitecture } from './architecture-review-diff'
import { renderArchitectureReview } from './architecture-review-markdown'
import { inspectArchitecture } from './architecture-review-source'

class PullRequestArchitectureReviewArgumentsError extends Error {
  override readonly name = 'PullRequestArchitectureReviewArgumentsError'
}

export function runArchitectureReviewCommand(args: readonly string[]): void {
  const { values } = parseArgs({
    args: [...args],
    options: {
      base: { type: 'string' },
      head: { type: 'string' },
      output: { type: 'string' },
    },
  })
  const base = requiredArgument(values.base, '--base')
  const head = requiredArgument(values.head, '--head')
  const output = requiredArgument(values.output, '--output')
  const changes = compareArchitecture(inspectArchitecture(base), inspectArchitecture(head))
  writeFileSync(output, renderArchitectureReview(changes), 'utf8')
}

function requiredArgument(value: string | undefined, name: string): string {
  if (value === undefined || value.trim().length === 0) {
    throw new PullRequestArchitectureReviewArgumentsError(`Missing required argument ${name}.`)
  }
  return value
}
