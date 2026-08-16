import { readFileSync } from 'node:fs'
import type { DraftComponentInput } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/enrich-draft-components-input'

/** @riviere-role cli-error */
class InvalidDraftComponentsFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidEnrichInputError'
  }
}

/** @riviere-role cli-entrypoint */
export function loadDraftComponents(filePath: string): DraftComponentInput[] {
  const parsed: unknown = (() => {
    try {
      return JSON.parse(readFileSync(filePath, 'utf8'))
    } catch {
      throw new InvalidDraftComponentsFileError(`Unable to read draft components: ${filePath}`)
    }
  })()
  if (!Array.isArray(parsed) || !parsed.every(isDraftComponentInput))
    throw new InvalidDraftComponentsFileError(
      `Enrich file does not contain valid draft components: ${filePath}`,
    )
  return parsed.filter(isDraftComponentInput)
}

function isDraftComponentInput(value: unknown): value is DraftComponentInput {
  if (!isRecord(value)) return false
  return (
    hasStringProperty(value, 'type') &&
    hasStringProperty(value, 'name') &&
    hasStringProperty(value, 'domain') &&
    hasStringProperty(value, 'module') &&
    isRecord(value.location) &&
    hasStringProperty(value.location, 'file') &&
    hasNumberProperty(value.location, 'line')
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function hasStringProperty(value: Record<string, unknown>, property: string): boolean {
  return typeof value[property] === 'string'
}

function hasNumberProperty(value: Record<string, unknown>, property: string): boolean {
  return typeof value[property] === 'number'
}
