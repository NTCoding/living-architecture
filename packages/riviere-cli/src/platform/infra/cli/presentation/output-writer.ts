import { writeFileSync } from 'node:fs'

interface OutputOptions {output?: string}

/** @riviere-role cli-output-formatter */
export function outputResult<T>(
  successPayload: {
    success: true
    data: T
    warnings: string[]
  },
  options: OutputOptions,
): void {
  if (options.output !== undefined) {
    writeFileSync(options.output, JSON.stringify(successPayload))
    return
  }

  console.log(JSON.stringify(successPayload))
}
