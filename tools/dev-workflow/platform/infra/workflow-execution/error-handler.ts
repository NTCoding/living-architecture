import { writeFileSync } from 'node:fs'

export function handleWorkflowError(error: unknown, outputFilePath?: string): void {
  const isError = error instanceof Error
  const jsonOutput = JSON.stringify(
    {
      success: false,
      nextAction: 'fix_errors',
      nextInstructions: `Unexpected error: ${isError ? error.message : String(error)}\n\nREMEMBER: /fix-it-never-work-around-it`,
      stack: isError ? error.stack : undefined,
    },
    null,
    2,
  )

  if (outputFilePath) {
    try {
      writeFileSync(outputFilePath, jsonOutput, 'utf-8')
    } catch {
      // Directory may not exist yet — don't mask the original error
    }
  }

  console.error(jsonOutput)
  process.stderr.write('', () => {
    process.exit(1)
  })
}
