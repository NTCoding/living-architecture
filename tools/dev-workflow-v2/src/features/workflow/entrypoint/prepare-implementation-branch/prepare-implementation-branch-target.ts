/** @riviere-role entrypoint-cli-input-parser */
export function parseImplementationBranchTarget(
  cliArguments: readonly string[],
): string | undefined {
  const targetArguments = cliArguments[0] === '--' ? cliArguments.slice(1) : cliArguments
  return targetArguments.length === 1 ? targetArguments[0] : undefined
}
