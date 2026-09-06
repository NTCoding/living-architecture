import { parentPort, workerData } from 'node:worker_threads'
import { z } from 'zod'
import { createGithubPullRequestClient } from '../create-pull-request.ts'

class ConcurrentCreationFixtureError extends Error {}

const input = z.object({ coordination: z.instanceof(SharedArrayBuffer) }).parse(workerData)
const coordination = new Int32Array(input.coordination)
const pullRequest = { number: 123, url: 'https://github.com/example/repo/pull/123', isDraft: false }
let initialLookup = true

function runGh(arguments_) {
  switch (arguments_[1]) {
    case 'list': {
      if (!initialLookup) return JSON.stringify([pullRequest])
      initialLookup = false
      const arrivals = Atomics.add(coordination, 0, 1) + 1
      if (arrivals === 2) Atomics.notify(coordination, 0)
      else if (Atomics.wait(coordination, 0, 1, 10_000) === 'timed-out') {
        throw new ConcurrentCreationFixtureError('Both clients did not reach the initial lookup.')
      }
      return '[]'
    }
    case 'create': {
      if (Atomics.compareExchange(coordination, 1, 0, 1) === 0) return pullRequest.url
      Atomics.add(coordination, 2, 1)
      throw new ConcurrentCreationFixtureError(
        'A pull request already exists for this head and base.',
      )
    }
    case 'view':
      return JSON.stringify(pullRequest)
    default:
      throw new ConcurrentCreationFixtureError('Unexpected GitHub command.')
  }
}

const result = createGithubPullRequestClient(runGh)({
  branch: 'issue-42',
  title: 'Ready PR',
  body: '[main-agent]\n\nConcurrent creation regression.',
})
if (parentPort === null)
  throw new ConcurrentCreationFixtureError('This fixture must run in a worker.')
parentPort.postMessage(result)
parentPort.close()
