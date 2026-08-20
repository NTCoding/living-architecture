import type { LoadDraftComponents } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-draft-components'
import {
  FileReadError,
  readJsonFile,
} from '../../../../infra/external-clients/filesystem/file-reader'

/** @riviere-role domain-port-adapter */
export function createDraftComponentsLoader(): LoadDraftComponents {
  return (path) => {
    try {
      return { success: true, draftComponents: readJsonFile(path, 'Draft components') }
    } catch (error) {
      if (error instanceof FileReadError) return { success: false, error: error.message }
      throw error
    }
  }
}
