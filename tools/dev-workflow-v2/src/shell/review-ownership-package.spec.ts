import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it, vi } from 'vitest'
import { ReviewCoordinator } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import type { ReviewAgentRun } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { createStore } from '@nt-ai-lab/deterministic-agent-workflow-event-store'

it('the published coordinator rejects duplicate execution without failing the owning review', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'living-review-ownership-'))
  const firstStore = createStore(join(directory, 'events.db'))
  const competingStore = createStore(join(directory, 'events.db'))
  const reviewTypes = ['proof-one', 'proof-two', 'proof-three', 'proof-four']
  const client = {
    start: vi.fn(
      async (): Promise<ReviewAgentRun> => ({
        providerSessionId: 'fixture-session',
        providerRunId: 'fixture-run',
        completion: Promise.resolve({ verdict: 'PASS', findings: [] }),
        cancel: async () => undefined,
      }),
    ),
    load: vi.fn(),
    cancel: vi.fn(),
  }
  const request = {
    bundleId: 'published-ownership-proof',
    sessionId: 'fixture-workflow',
    repository: 'fixture/repository',
    workingDirectory: directory,
    pullRequestNumber: 1,
    baseRevision: 'a'.repeat(40),
    headRevision: 'b'.repeat(40),
    changedFiles: ['fixture.ts'],
    stateInstructions: 'Exercise published ownership, not a real review.',
    reviews: reviewTypes.map((reviewType) => ({
      reviewType,
      instructions: 'Inspect the fixture.',
      version: 'fixture-v1',
    })),
  }
  const owner = new ReviewCoordinator({
    store: firstStore,
    client,
    now: () => new Date().toISOString(),
  })
  const competitor = new ReviewCoordinator({
    store: competingStore,
    client,
    now: () => new Date().toISOString(),
  })
  try {
    const completion = owner.run(request, 'REVIEWING')
    await expect(competitor.run(request, 'REVIEWING')).rejects.toThrow(
      'Unable to claim SQLite exclusive lock',
    )
    await expect(completion).resolves.toMatchObject({ type: 'completed' })
    expect({
      launches: client.start.mock.calls.length,
      reviews: firstStore.listSessionReviews('fixture-workflow').map((review) => review.reviewType),
    }).toStrictEqual({ launches: 4, reviews: reviewTypes })
  } finally {
    firstStore.db.close()
    competingStore.db.close()
    rmSync(directory, { recursive: true, force: true })
  }
})
