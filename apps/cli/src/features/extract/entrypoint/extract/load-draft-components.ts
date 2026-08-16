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
  const parsed = (() => {
    try {
      return JSON.parse<DraftComponentInput[]>(readFileSync(filePath, 'utf8'))
    } catch {
      throw new InvalidDraftComponentsFileError(`Unable to read draft components: ${filePath}`)
    }
  })()
  if (!Array.isArray(parsed))
    throw new InvalidDraftComponentsFileError(
      `Enrich file does not contain valid draft components: ${filePath}`,
    )
  return parsed
}
