import type { AiCli } from './ports/ai-cli'
import type { WorkflowRunMode } from './workflow'

type AiStageFailure = Readonly<{
  readonly success: false
  readonly errorCode: string
  readonly reason: string
}>

/**
 * @riviere-role domain-service
 * @riviere-role-justification Checking an active AI command and translating the result into a Workflow stage failure coordinates a domain port with stage execution. No aggregate or value object holds state that could own this orchestration.
 */
export class AiStageAvailability {
  static async check(
    aiCli: AiCli,
    command: string,
    stageKind: 'ai-extract' | 'ai-enrich',
    mode: WorkflowRunMode,
  ): Promise<AiStageFailure> {
    if (mode.value === 'dry-run') {
      return unavailableStage(stageKind)
    }
    const availability = await aiCli.checkAvailability(command)
    if (availability.kind === 'unavailable') {
      return {
        success: false,
        errorCode: 'AI_CLI_UNAVAILABLE',
        reason: availability.reason,
      }
    }
    return unavailableStage(stageKind)
  }
}

function unavailableStage(stageKind: 'ai-extract' | 'ai-enrich'): AiStageFailure {
  return {
    success: false,
    errorCode: 'STAGE_BEHAVIOUR_UNAVAILABLE',
    reason: `Stage behaviour is unavailable for '${stageKind}'`,
  }
}
