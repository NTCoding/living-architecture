import type { DraftComponentInput } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/enrich-draft-components-input'
import { InvalidDraftComponentsFileError } from '../../../../infra/cli/presentation/extract-errors'

/** @riviere-role entrypoint-cli-input-parser */
export function parseDraftComponents(filePath: string, fileContents: string): DraftComponentInput[] {
  const parsed = readDraftComponents(filePath, fileContents)
  if (!Array.isArray(parsed) || !parsed.every(isDraftComponentInput))
    throw new InvalidDraftComponentsFileError(
      `Enrich file does not contain valid draft components: ${filePath}`,
    )
  return parsed.filter(isDraftComponentInput)
}

function readDraftComponents(filePath: string, fileContents: string): unknown {
  try {
    const parsed: unknown = JSON.parse(fileContents)
    return parsed
  } catch {
    throw new InvalidDraftComponentsFileError(`Unable to read draft components: ${filePath}`)
  }
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
