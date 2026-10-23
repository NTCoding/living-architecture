import { Mastra } from '@mastra/core'
import type { MastraScorers } from '@mastra/core/evals'
import type { Workflow } from '@mastra/core/workflows'
import { LibSQLStore } from '@mastra/libsql'
import { Memory } from '@mastra/memory'
import { MastraStorageExporter, Observability } from '@mastra/observability'

/** @riviere-role external-client-model */
export interface MastraStorage {
  readonly storage: LibSQLStore
  readonly memory: Memory
}

/**
 * @riviere-role external-client-service
 */
export function createMastraStorage(url: string): MastraStorage {
  const storage = new LibSQLStore({ id: 'factory', url })
  return { storage, memory: new Memory({ storage }) }
}

/**
 * @riviere-role external-client-service
 */
export function createObservability(): Observability {
  return new Observability({
    configs: {
      default: {
        serviceName: 'dev-workflow-v3',
        exporters: [new MastraStorageExporter()],
      },
    },
  })
}

/**
 * @riviere-role external-client-service
 */
export function createMastraInstance(request: {
  readonly storage: LibSQLStore
  readonly workflows: Readonly<Record<string, Workflow>>
  readonly scorers: MastraScorers
}): Mastra {
  return new Mastra({
    workflows: request.workflows,
    storage: request.storage,
    observability: createObservability(),
    scorers: Object.fromEntries(
      Object.entries(request.scorers).map(([id, entry]) => [id, entry.scorer]),
    ),
  })
}
