export function handleWorkflowError(error: unknown): never {
  const isError = error instanceof Error
  console.error(
    JSON.stringify(
      {
        success: false,
        nextAction: 'fix_errors',
        nextInstructions: `Unexpected error: ${isError ? error.message : String(error)}`,
        stack: isError ? error.stack : undefined,
      },
      null,
      2,
    ),
  )
  process.exit(1)
}
