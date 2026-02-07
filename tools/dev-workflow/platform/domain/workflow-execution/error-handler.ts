export function handleWorkflowError(error: unknown): never {
  const isError = error instanceof Error
  console.error(
    JSON.stringify(
      {
        success: false,
        nextAction: 'fix_errors',
        nextInstructions: `Unexpected error: ${isError ? error.message : String(error)}\n\nREMEMBER: /fix-it-never-work-around-it`,
        stack: isError ? error.stack : undefined,
      },
      null,
      2,
    ),
  )
  process.exit(1)
}
