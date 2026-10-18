import type { AiCli } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'

export function unavailableAiCli(): AiCli {
  return {
    checkAvailability: () => ({ kind: 'unavailable', reason: 'AI CLI is not configured' }),
    run: () => ({ kind: 'invocation-failure', reason: 'AI CLI is not configured' }),
  }
}
