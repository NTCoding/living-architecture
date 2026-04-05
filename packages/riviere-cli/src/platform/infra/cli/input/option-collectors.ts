/** @riviere-role cli-input-validator */
export function collectOption(value: string, previous: string[]): string[] {
  return [...previous, value]
}
