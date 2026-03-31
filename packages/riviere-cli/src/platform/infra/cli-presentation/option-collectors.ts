/** @riviere-role command-input-factory */
export function collectOption(value: string, previous: string[]): string[] {
  return [...previous, value]
}
