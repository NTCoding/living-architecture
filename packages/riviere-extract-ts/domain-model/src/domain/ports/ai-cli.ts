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
  readonly command: string
  readonly args: readonly string[]
  readonly prompt: string
  readonly timeoutSeconds: number
  readonly maximumOutputBytes: number
}>

type RunAiCliSuccess = Readonly<{
  readonly kind: 'success'
  readonly output: string
  readonly outputTruncated: boolean
}>

type RunAiCliTimeout = Readonly<{
  readonly kind: 'timeout'
  readonly timeoutSeconds: number
  readonly partialOutput: string
  readonly partialError: string
}>

type RunAiCliSpawnFailure = Readonly<{
  readonly kind: 'spawn-failure'
  readonly command: string
  readonly reason: string
}>

type RunAiCliExecutionFailure = Readonly<{
  readonly kind: 'execution-failure'
  readonly command: string
  readonly exitCode: number
  readonly stderr: string
}>

type RunAiCliInvalidArguments = Readonly<{
  readonly kind: 'invalid-arguments'
  readonly reason: string
}>

type RunAiCliResult =
  | RunAiCliSuccess
  | RunAiCliTimeout
  | RunAiCliSpawnFailure
  | RunAiCliExecutionFailure
  | RunAiCliInvalidArguments

/**
 * @riviere-role domain-port
 * @riviere-role-justification The AI CLI reports whether its command can run and performs a current external action during Workflow stage execution. It neither restores previously created Project state nor replaces state that the repository loads as part of the Project aggregate.
 */
export interface AiCli {
  checkAvailability(command: string): Promise<AiCliAvailability>
  run(input: RunAiCliInput): Promise<RunAiCliResult>
}

export type {
  AiCliAvailability,
  RunAiCliExecutionFailure,
  RunAiCliInput,
  RunAiCliInvalidArguments,
  RunAiCliResult,
  RunAiCliSpawnFailure,
  RunAiCliSuccess,
  RunAiCliTimeout,
}
