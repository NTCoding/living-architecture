import { DraftComponent } from '@living-architecture/riviere-extract-ts-domain-model/domain/component-extraction/draft-component'
import type {
  DraftComponentsLoadResult,
  LoadDraftComponents,
} from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-draft-components'
import { FileReadError, readJsonFile } from '../../../../infra/external-clients/filesystem/file-reader'
import { ExtractionDataAccessError } from '../../data-access/riviere-project/riviere-project-error'

/** @riviere-role domain-port-adapter */
export function createDraftComponentsLoader(): LoadDraftComponents {
  return (path) => {
    try {
      return parseDraftComponents(readJsonFile(path, 'Draft components'))
    } catch (error) {
      if (error instanceof FileReadError) throw new ExtractionDataAccessError('FILE_READ_ERROR', error.message)
      throw error
    }
  }
}

function parseDraftComponents(value: unknown): DraftComponentsLoadResult {
  if (!Array.isArray(value)) return { success: false, error: 'Draft components must be an array' }
  const draftComponents = []
  for (const component of value) {
    const parsed = DraftComponent.parse(component)
    if (!parsed.success) return { success: false, error: parsed.error }
    draftComponents.push(parsed.data)
  }
  return { success: true, draftComponents }
}
