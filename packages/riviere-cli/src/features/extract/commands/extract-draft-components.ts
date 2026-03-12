import { ExtractionProjectRepository } from '../infra/persistence/extraction-project/extraction-project-repository'
import type { ExtractDraftComponentsInput } from './extract-draft-components-input'
import type { ExtractDraftComponentsResult } from './extract-draft-components-result'

/** @riviere-role command-use-case */
export function extractDraftComponents(
  extractDraftComponentsInput: ExtractDraftComponentsInput,
): ExtractDraftComponentsResult {
  const extractionProjectRepository = new ExtractionProjectRepository()
  const extractionProject = loadProjectFromInput(
    extractionProjectRepository,
    extractDraftComponentsInput,
  )

  return extractionProject.extractDraftComponents({
    allowIncomplete: extractDraftComponentsInput.allowIncomplete,
    includeConnections: extractDraftComponentsInput.includeConnections,
  })
}

function loadProjectFromInput(
  extractionProjectRepository: ExtractionProjectRepository,
  extractDraftComponentsInput: ExtractDraftComponentsInput,
) {
  if (extractDraftComponentsInput.sourceMode === 'pull-request') {
    return extractionProjectRepository.loadFromChangedProject({
      configPath: extractDraftComponentsInput.configPath,
      ...(extractDraftComponentsInput.baseBranch === undefined
        ? {}
        : { baseBranch: extractDraftComponentsInput.baseBranch }),
      useTsConfig: extractDraftComponentsInput.useTsConfig,
    })
  }

  if (extractDraftComponentsInput.sourceMode === 'files') {
    return extractionProjectRepository.loadFromSelectedFiles({
      configPath: extractDraftComponentsInput.configPath,
      filePaths: extractDraftComponentsInput.files ?? [],
      useTsConfig: extractDraftComponentsInput.useTsConfig,
    })
  }

  return extractionProjectRepository.loadFromFullProject({
    configPath: extractDraftComponentsInput.configPath,
    useTsConfig: extractDraftComponentsInput.useTsConfig,
  })
}
