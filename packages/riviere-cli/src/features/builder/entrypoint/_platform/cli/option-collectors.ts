/** @riviere-role entrypoint-cli-input-parser */
export function collectOption(value: string, previous: string[]): string[] {
  return [...previous, value]
}
