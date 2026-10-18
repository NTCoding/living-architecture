/**
 * @riviere-role domain-port
 * @riviere-role-justification The AI CLI invocation is a current external action used during Workflow stage behaviour, not aggregate state created earlier and owned by the Project repository.
 */
export interface RunAiCliInput {
  readonly command: string
  readonly arguments: readonly string[]
  readonly prompt: string
  readonly timeoutSeconds: number
}

/**
 * @riviere-role domain-port
 * @riviere-role-justification The AI CLI result is a current external outcome used during Workflow stage behaviour, not aggregate state created earlier and owned by the Project repository.
 */
export type RunAiCliResult =
  | Readonly<{ kind: 'success'; output: string }>
  | Readonly<{ kind: 'timeout' }>
  | Readonly<{ kind: 'non-zero-exit'; exitCode: number; stderr: string }>
  | Readonly<{ kind: 'output-truncated'; limitBytes: number }>
  | Readonly<{ kind: 'invocation-failure'; reason: string }>

/**
 * @riviere-role domain-port
 * @riviere-role-justification The AI CLI availability is a current external fact used during Workflow stage behaviour, not aggregate state created earlier and owned by the Project repository.
 */
export type AiCliAvailability =
  | Readonly<{ kind: 'available' }>
  | Readonly<{ kind: 'unavailable'; reason: string }>

/**
 * @riviere-role domain-port
 * @riviere-role-justification The AI CLI performs a current external action and reports a current external fact used during Workflow stage behaviour, not aggregate state created earlier and owned by the Project repository.
 */
export interface AiCli {
  checkAvailability(command: string): AiCliAvailability
  run(input: RunAiCliInput): Promise<RunAiCliResult>
}
