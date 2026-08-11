class InvalidDomainJsonError extends Error {
  readonly value: string

  constructor(value: string) {
    super(`Invalid domain JSON: ${value}`)
    this.name = 'InvalidDomainJsonError'
    this.value = value
  }
}

interface DomainInputParsed {
  description: string
  name: string
  systemType: string
}

function isDomainInputParsed(value: unknown): value is DomainInputParsed {
  if (typeof value !== 'object' || value === null) return false
  return (
    'name' in value &&
    typeof value.name === 'string' &&
    'description' in value &&
    typeof value.description === 'string' &&
    'systemType' in value &&
    typeof value.systemType === 'string'
  )
}

/** @riviere-role entrypoint-cli-input-parser */
export function parseDomainJson(value: string, previous: DomainInputParsed[]): DomainInputParsed[] {
  const parsed: unknown = JSON.parse(value)
  if (!isDomainInputParsed(parsed)) throw new InvalidDomainJsonError(value)
  return [...previous, parsed]
}
