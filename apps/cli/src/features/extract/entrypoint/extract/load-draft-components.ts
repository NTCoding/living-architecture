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
      return JSON.parse(readFileSync(filePath, 'utf8')) as unknown
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
  if (value === null || typeof value !== 'object') return false
  if (!('type' in value) || typeof value.type !== 'string') return false
  if (!('name' in value) || typeof value.name !== 'string') return false
  if (!('domain' in value) || typeof value.domain !== 'string') return false
  if (!('module' in value) || typeof value.module !== 'string') return false
  if (!('location' in value) || value.location === null || typeof value.location !== 'object') {
    return false
  }
  return (
    'file' in value.location &&
    typeof value.location.file === 'string' &&
    'line' in value.location &&
    typeof value.location.line === 'number'
  )
}
