/** @riviere-role cli-response */
export type CliResponse =
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
export function formatSuccessfulCliResponse(message: string): CliResponse {
  return { message, stream: 'stdout' }
}

/** @riviere-role cli-response-formatter */
export function formatFailedCliResponse(message: string): CliResponse {
  return { exitCode: 1, message, stream: 'stderr' }
}
