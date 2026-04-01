import type { SystemType } from '@living-architecture/riviere-schema'
import { isValidSystemType } from './component-types'

class InvalidDomainJsonError extends Error {
  readonly value: string

  constructor(value: string) {
    super(`Invalid domain JSON: ${value}`)
    this.name = 'InvalidDomainJsonError'
    this.value = value
  }
}

interface DomainInputParsed {
  name: string
  description: string
  systemType: SystemType
}

export type { DomainInputParsed }

function isDomainInputParsed(value: unknown): value is DomainInputParsed {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  return (
    'name' in value &&
    typeof value.name === 'string' &&
    'description' in value &&
    typeof value.description === 'string' &&
    'systemType' in value &&
    typeof value.systemType === 'string' &&
    isValidSystemType(value.systemType)
  )
}

/** @riviere-role command-input-factory */
export function parseDomainJson(value: string, previous: DomainInputParsed[]): DomainInputParsed[] {
  const parsed: unknown = JSON.parse(value)
  if (!isDomainInputParsed(parsed)) {
    throw new InvalidDomainJsonError(value)
  }
  return [...previous, parsed]
}
