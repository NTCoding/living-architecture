import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { compareArchitecture } from './pull-request-architecture-review/architecture-review-diff'
import { renderArchitectureReview } from './pull-request-architecture-review/architecture-review-markdown'
import { inspectArchitecture } from './pull-request-architecture-review/architecture-review-source'

class PullRequestArchitectureReviewArgumentsError extends Error {
  override readonly name = 'PullRequestArchitectureReviewArgumentsError'
}

const { values } = parseArgs({
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

function requiredArgument(value: string | undefined, name: string): string {
  if (value === undefined || value.trim().length === 0) {
    throw new PullRequestArchitectureReviewArgumentsError(`Missing required argument ${name}.`)
  }
  return value
}
