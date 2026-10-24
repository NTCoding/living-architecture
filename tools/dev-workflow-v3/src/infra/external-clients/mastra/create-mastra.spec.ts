import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Mastra } from '@mastra/core'
import { createScorer } from '@mastra/core/evals'
import { Observability } from '@mastra/observability'
import {
  createMastraInstance,
  createMastraStorage,
  createObservability,
  observationalMemoryModelOf,
  MissingObservationalMemoryModel,
} from './create-mastra'

describe('createMastraStorage', () => {
  it('creates LibSQL storage and memory over one database', () => {
    const directory = mkdtempSync(join(tmpdir(), 'factory-storage-'))

    const { storage, memory } = createMastraStorage(`file:${directory}/mastra.db`)

    expect(storage.id).toBe('factory')
    expect(memory).toBeDefined()
  })

  it('refuses the observational memory model before the run sets one', () => {
    expect(() => observationalMemoryModelOf()).toThrow(MissingObservationalMemoryModel)
  })

  it('resolves the observational memory model the run set from the command line', () => {
    const directory = mkdtempSync(join(tmpdir(), 'factory-storage-'))
    const { setObservationalMemoryModel, memory } = createMastraStorage(
      `file:${directory}/mastra.db`,
    )

    setObservationalMemoryModel('zai/glm-5.3-flash')

    expect(memory).toBeDefined()
    expect(observationalMemoryModelOf()).toStrictEqual({
      providerId: 'zai',
      modelId: 'glm-5.3-flash',
    })
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
      agents: {},
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
