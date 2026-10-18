import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChildProcessClient } from '../../../../infra/external-clients/child-process/child-process-client'
import { AiCliAdapter } from './ai-cli-adapter'

describe('AiCliAdapter availability', () => {
  const childProcessClient = new ChildProcessClient()
  const adapter = new AiCliAdapter(childProcessClient)

  afterEach(() => vi.restoreAllMocks())

  it('reports an available command when the child process client can run it', async () => {
    vi.spyOn(childProcessClient, 'checkCommand').mockResolvedValue({
      kind: 'available',
      command: 'claude',
    })

    await expect(adapter.checkAvailability('claude')).resolves.toStrictEqual({
      kind: 'available',
      command: 'claude',
    })
  })

  it('reports the child process reason when the command is unavailable', async () => {
    vi.spyOn(childProcessClient, 'checkCommand').mockResolvedValue({
      kind: 'unavailable',
      command: 'claude',
      reason: 'spawn claude ENOENT',
    })

    await expect(adapter.checkAvailability('claude')).resolves.toStrictEqual({
      kind: 'unavailable',
      command: 'claude',
      reason: 'spawn claude ENOENT',
    })
  })
})
