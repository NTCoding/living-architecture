import type {
  AiEnrichConfig,
  AiExtractConfig,
} from '@living-architecture/riviere-extract-config-published-language'

type AiCliAvailability =
  | Readonly<{
      readonly kind: 'available'
      readonly command: string
    }>
  | Readonly<{
      readonly kind: 'unavailable'
      readonly command: string
      readonly reason: string
    }>

type RunAiCliInput = Readonly<{
  readonly stageConfiguration: AiExtractConfig | AiEnrichConfig
  readonly prompt: string
}>

type RunAiCliResult =
  | Readonly<{
      readonly kind: 'completed'
      readonly output: string
    }>
  | Readonly<{
      readonly kind: 'incomplete'
      readonly output: string
      readonly reason: string
    }>
  | Readonly<{
      readonly kind: 'failed'
      readonly reason: string
    }>
  | Readonly<{
      readonly kind: 'timed-out'
    }>

/**
 * @riviere-role domain-port
 * @riviere-role-justification The AI-assisted extraction capability reports whether its configured assistant can run and performs the current external extraction action during Workflow stage execution. It neither restores previously created Project state nor replaces state that the repository loads as part of the Project aggregate.
 */
export interface AiCli {
  checkAvailability(command: string): Promise<AiCliAvailability>
  run(input: RunAiCliInput): Promise<RunAiCliResult>
}

export type { AiCliAvailability, RunAiCliInput, RunAiCliResult }
