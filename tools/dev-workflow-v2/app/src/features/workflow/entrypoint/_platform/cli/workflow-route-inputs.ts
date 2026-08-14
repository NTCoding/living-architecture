/** @riviere-role entrypoint-cli-input-parser */
export function parseNumberArgument(value: unknown): number {
  if (typeof value !== 'number') throw new TypeError('Expected parsed number')
  return value
}

/** @riviere-role entrypoint-cli-input-parser */
export function parseStringArgument(value: unknown): string {
  if (typeof value !== 'string') throw new TypeError('Expected parsed string')
  return value
}

/** @riviere-role entrypoint-cli-input-parser */
export function parseOptionalStringArgument(value: unknown): string | undefined {
  if (value === undefined || typeof value === 'string') return value
  throw new TypeError('Expected parsed optional string')
}

/** @riviere-role entrypoint-cli-input-parser */
export function parseStringArguments(value: unknown): readonly string[] {
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value
  throw new TypeError('Expected parsed string arguments')
}
