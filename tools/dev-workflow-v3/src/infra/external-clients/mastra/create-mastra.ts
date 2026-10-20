import { Mastra } from '@mastra/core'
import type { Workflow } from '@mastra/core/workflows'
import { LibSQLStore } from '@mastra/libsql'
import { Memory } from '@mastra/memory'

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
export function createMastraInstance(request: {
  readonly storage: LibSQLStore
  readonly workflows: Readonly<Record<string, Workflow>>
}): Mastra {
  return new Mastra({ workflows: request.workflows, storage: request.storage })
}
