/** @riviere-role entrypoint-cli-input-parser */
export function parseImplementationBranchTarget(
  cliArguments: readonly string[],
): string | undefined {
  return cliArguments[0]
}
