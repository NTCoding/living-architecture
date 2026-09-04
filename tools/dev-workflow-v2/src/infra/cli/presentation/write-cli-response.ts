import type { CliOutput } from './format-cli-response'

/** @riviere-role cli-response-writer */
export function writeCliResponse(response: CliOutput): void {
  if (response.stream === 'stdout') {
    process.stdout.write(response.message)
    return
  }
  process.stderr.write(response.message)
  process.exitCode = response.exitCode
}
