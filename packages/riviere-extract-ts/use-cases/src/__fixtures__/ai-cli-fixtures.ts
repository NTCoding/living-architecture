import type { AiCli } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'

export function unavailableAiCli(): AiCli {
  return {
    checkAvailability: () => ({ kind: 'available' }),
    run: () => ({ kind: 'invocation-failure', reason: 'not configured' }),
  }
}
