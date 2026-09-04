/** @riviere-role entrypoint-cli-input-parser */
export function parseImplementationBranchTarget(
  cliArguments: readonly string[],
): string | undefined {
  return cliArguments.length === 1 ? cliArguments[0] : undefined
}
