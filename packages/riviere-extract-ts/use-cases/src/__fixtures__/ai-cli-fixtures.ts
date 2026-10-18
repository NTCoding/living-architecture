import type { AiCli } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'

export function unavailableAiCli(): AiCli {
  return {
    checkAvailability: () => Promise.resolve({ kind: 'available' }),
    run: () => Promise.resolve({ kind: 'invocation-failure', reason: 'not configured' }),
  }
}
