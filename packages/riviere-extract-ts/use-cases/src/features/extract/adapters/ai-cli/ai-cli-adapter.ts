import type {
  AiCli,
  AiCliAvailability,
} from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'
import type { ChildProcessClient } from '../../../../infra/external-clients/child-process/child-process-client'

/** @riviere-role domain-port-adapter */
export class AiCliAdapter implements AiCli {
  constructor(private readonly childProcessClient: ChildProcessClient) {}

  async checkAvailability(command: string): Promise<AiCliAvailability> {
    const availability = await this.childProcessClient.checkCommand(command)
    if (availability.kind === 'unavailable') {
      return { kind: 'unavailable', command, reason: availability.reason }
    }
    return { kind: 'available', command }
  }
}
