import { Worker } from 'node:worker_threads'
import { expect, it } from 'vitest'
import { z } from 'zod'

class CreationWorkerExitedError extends Error {}

const resultSchema = z.object({
  prNumber: z.number().int().positive(),
  prUrl: z.string().url(),
  isDraft: z.boolean(),
  repository: z.string(),
  baseRevision: z.string(),
  headRevision: z.string(),
})

function receiveResult(worker: Worker): Promise<z.infer<typeof resultSchema>> {
  return new Promise((resolve, reject) => {
    worker.once('message', (message: unknown) => {
      const result = resultSchema.safeParse(message)
      if (result.success) resolve(result.data)
      else reject(result.error)
    })
    worker.once('error', reject)
    worker.once('exit', (code) =>
      reject(
        new CreationWorkerExitedError(
          `Worker exited (${String(code)}) before delivering a valid PR result.`,
        ),
      ),
    )
  })
}

it('reconciles two simultaneous clients to one PR after both initial lookups return empty', async () => {
  const coordination = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 3)
  const workers = [0, 1].map(
    () =>
      new Worker(new URL('./__fixtures__/concurrent-pr-creation.mjs', import.meta.url), {
        workerData: { coordination },
        execArgv: ['--import', 'tsx'],
      }),
  )
  try {
    const results = await Promise.all(workers.map(receiveResult))
    expect(results).toStrictEqual([
      {
        prNumber: 123,
        prUrl: 'https://github.com/example/repo/pull/123',
        isDraft: false,
        repository: 'example/repo',
        baseRevision: 'a'.repeat(40),
        headRevision: 'b'.repeat(40),
      },
      {
        prNumber: 123,
        prUrl: 'https://github.com/example/repo/pull/123',
        isDraft: false,
        repository: 'example/repo',
        baseRevision: 'a'.repeat(40),
        headRevision: 'b'.repeat(40),
      },
    ])
    expect(Array.from(new Int32Array(coordination))).toStrictEqual([2, 1, 1])
  } finally {
    await Promise.all(workers.map((worker) => worker.terminate()))
  }
}, 20_000)
