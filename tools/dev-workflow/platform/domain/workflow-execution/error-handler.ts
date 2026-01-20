export function handleWorkflowError(error: unknown): never {
  console.error(
    JSON.stringify(
      {
        success: false,
        nextAction: 'fix_errors',
        nextInstructions: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      },
      null,
      2,
    ),
  )
  process.exit(1)
}
