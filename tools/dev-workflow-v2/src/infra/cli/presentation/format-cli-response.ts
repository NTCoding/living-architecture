/** @riviere-role cli-output */
export type CliOutput =
  | {
      readonly message: string
      readonly stream: 'stdout'
    }
  | {
      readonly exitCode: number
      readonly message: string
      readonly stream: 'stderr'
    }

/** @riviere-role cli-response-formatter */
export function formatSuccessfulCliResponse(message: string): CliOutput {
  return { message, stream: 'stdout' }
}

/** @riviere-role cli-response-formatter */
export function formatFailedCliResponse(message: string): CliOutput {
  return { exitCode: 1, message, stream: 'stderr' }
}
