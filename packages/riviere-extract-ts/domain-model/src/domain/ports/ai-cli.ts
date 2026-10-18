/**
 * @riviere-role domain-port
 * @riviere-role-justification The AI CLI command is an external capability invoked during Workflow stage behaviour, not aggregate state created earlier in the Project lifecycle, so it is not state that the Project repository should load as part of the aggregate.
 */
export type AiCli = Readonly<{
  checkAvailability(
    command: string,
  ): Promise<Readonly<{ kind: 'available' }> | Readonly<{ kind: 'unavailable'; reason: string }>>
  run(
    input: Readonly<{
      command: string
      args: readonly string[]
      prompt: string
      timeoutMilliseconds: number
    }>,
  ): Promise<
    | Readonly<{ kind: 'completed'; standardOutput: string; standardError: string }>
    | Readonly<{
        kind: 'exited-with-failure'
        exitCode: number | null
        standardOutput: string
        standardError: string
      }>
    | Readonly<{ kind: 'spawn-failed'; reason: string }>
    | Readonly<{ kind: 'timed-out'; timeoutMilliseconds: number }>
    | Readonly<{
        kind: 'output-exceeded'
        stream: 'standardOutput' | 'standardError'
      }>
    | Readonly<{ kind: 'invalid-prompt-arguments'; reason: string }>
  >
}>
