import type { SystemType } from '@living-architecture/riviere-schema'
import { isValidSystemType } from '../../../platform/infra/cli-presentation/component-types'
import { InvalidDomainJsonError } from '../../../platform/infra/errors/errors'

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

export function parseDomainJson(value: string, previous: DomainInputParsed[]): DomainInputParsed[] {
  const parsed: unknown = JSON.parse(value)
  if (!isDomainInputParsed(parsed)) {
    throw new InvalidDomainJsonError(value)
  }
  return [...previous, parsed]
}
