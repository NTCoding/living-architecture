import { Mastra } from '@mastra/core'
import type { Agent } from '@mastra/core/agent'
import type { MastraScorers } from '@mastra/core/evals'
import type { Workflow } from '@mastra/core/workflows'
import { LibSQLStore } from '@mastra/libsql'
import { Memory } from '@mastra/memory'
import { MastraStorageExporter, Observability } from '@mastra/observability'
import { JsonlLogExporter } from './jsonl-log-exporter'

/** @riviere-role external-client-model */
export interface MastraStorage {
  readonly storage: LibSQLStore
  readonly memory: Memory
  readonly setObservationalMemoryModel: (model: string) => void
}

/**
 * @riviere-role external-client-service
 */
const observationalMemoryModel: { current: string | undefined } = { current: undefined }

/**
 * @riviere-role external-client-service
 */
export function createMastraStorage(url: string): MastraStorage {
  const storage = new LibSQLStore({ id: 'factory', url })
  return {
    storage,
    memory: new Memory({
      storage,
      options: {
        observationalMemory: {
          model: observationalMemoryModelOf,
        },
      },
    }),
    setObservationalMemoryModel: (model: string) => {
      observationalMemoryModel.current = model
    },
  }
}

/**
 * @riviere-role external-client-service
 */
export function observationalMemoryModelOf(): string {
  if (observationalMemoryModel.current === undefined) throw new MissingObservationalMemoryModel()
  return observationalMemoryModel.current
}

/** @riviere-role external-client-error */
export class MissingObservationalMemoryModel extends Error {
  constructor() {
    super('No observational memory model was set. Set it from the run model before generating.')
    this.name = 'MissingObservationalMemoryModel'
  }
}

/**
 * @riviere-role external-client-service
 */
export function createObservability(logFilePath: string): Observability {
  return new Observability({
    configs: {
      default: {
        serviceName: 'dev-workflow-v3',
        exporters: [new MastraStorageExporter(), new JsonlLogExporter(logFilePath)],
      },
    },
  })
}

/**
 * @riviere-role external-client-service
 */
export function createMastraInstance(request: {
  readonly storage: LibSQLStore
  readonly logFilePath: string
  readonly agents: Record<string, Agent>
  readonly workflows: Readonly<Record<string, Workflow>>
  readonly scorers: MastraScorers
}): Mastra {
  return new Mastra({
    agents: request.agents,
    workflows: request.workflows,
    storage: request.storage,
    observability: createObservability(request.logFilePath),
    scorers: Object.fromEntries(
      Object.entries(request.scorers).map(([id, entry]) => [id, entry.scorer]),
    ),
  })
}
