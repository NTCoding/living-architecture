import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Mastra } from '@mastra/core'
import { createScorer } from '@mastra/core/evals'
import { Observability } from '@mastra/observability'
import { createMastraInstance, createMastraStorage, createObservability } from './create-mastra'

describe('createMastraStorage', () => {
  it('creates LibSQL storage and memory over one database', () => {
    const directory = mkdtempSync(join(tmpdir(), 'factory-storage-'))

    const { storage, memory } = createMastraStorage(`file:${directory}/mastra.db`)

    expect(storage.id).toBe('factory')
    expect(memory).toBeDefined()
  })
})

describe('createObservability', () => {
  it('creates observability for the dev-workflow-v3 service', () => {
    const directory = mkdtempSync(join(tmpdir(), 'factory-observability-'))
    const observability = createObservability(join(directory, 'mastra-logs.jsonl'))

    expect(observability).toBeInstanceOf(Observability)
  })
})

describe('createMastraInstance', () => {
  it('creates the Mastra instance over the shared storage', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'factory-mastra-'))
    const { storage } = createMastraStorage(`file:${directory}/mastra.db`)

    const mastra = createMastraInstance({
      storage,
      logFilePath: join(directory, 'mastra-logs.jsonl'),
      workflows: {},
      scorers: {
        effort: {
          scorer: createScorer({ id: 'effort', description: 'spec scorer' }),
        },
      },
    })

    expect(mastra).toBeInstanceOf(Mastra)
    expect(mastra.getStorage()).toBeDefined()
  })
})
