import { ExitCode } from './error-codes'

/** @riviere-role cli-output */
export interface CliOutput {
  readonly success: boolean
  readonly data?: string
  readonly error?: Readonly<{ code: string; message: string; suggestions: readonly string[] }>
  readonly warnings?: readonly string[]
}

/** @riviere-role cli-response-writer */
export function writeCliOutput(output: CliOutput): void {
  if (output.success) {
    console.log(JSON.stringify(output))
    return
  }
  console.error(JSON.stringify(output))
  process.exitCode = ExitCode.RuntimeError
}
