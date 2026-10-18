type AiCliAvailability =
  | Readonly<{ kind: 'available' }>
  | Readonly<{ kind: 'unavailable'; command: string; reason: string }>

type AiCliOutput = Readonly<{
  text: string
  truncated: boolean
}>

type RunAiCliInput = Readonly<{
  command: string
  args: readonly string[]
  prompt: string
  timeoutMilliseconds: number
}>

type RunAiCliResult =
  | Readonly<{
      kind: 'completed'
      stdout: AiCliOutput
      stderr: AiCliOutput
    }>
  | Readonly<{
      kind: 'failed'
      exitCode: number
      stdout: AiCliOutput
      stderr: AiCliOutput
    }>
  | Readonly<{
      kind: 'timed-out'
      timeoutMilliseconds: number
      stdout: AiCliOutput
      stderr: AiCliOutput
    }>
  | Readonly<{
      kind: 'failed-to-launch'
      reason: string
      stdout: AiCliOutput
      stderr: AiCliOutput
    }>

/**
 * @riviere-role domain-port
 * @riviere-role-justification The AI CLI is an external capability the Workflow invokes during stage behaviour; it is not state created earlier in the Project lifecycle, so the Project repository must not load it as aggregate state.
 */
export interface AiCli {
  checkAvailability(command: string): Promise<AiCliAvailability>
  run(input: RunAiCliInput): Promise<RunAiCliResult>
}

export type { AiCliAvailability, AiCliOutput, RunAiCliInput, RunAiCliResult }
