import {
  loadChangedProject,
  loadFullProject,
  loadSelectedFiles,
} from '../infra/persistence/extraction-project/load-extraction-project'
import type { ExtractDraftComponentsInput } from './extract-draft-components-input'
import type { ExtractDraftComponentsResult } from './extract-draft-components-result'

/** @riviere-role command-use-case */
export function extractDraftComponents(
  extractDraftComponentsInput: ExtractDraftComponentsInput,
): ExtractDraftComponentsResult {
  const extractionProject = loadProject(extractDraftComponentsInput)

  return extractionProject.extractDraftComponents({
    allowIncomplete: extractDraftComponentsInput.allowIncomplete,
    includeConnections: extractDraftComponentsInput.includeConnections,
  })
}

function loadProject(extractDraftComponentsInput: ExtractDraftComponentsInput) {
  if (extractDraftComponentsInput.sourceMode === 'pull-request') {
    return loadChangedProject({
      configPath: extractDraftComponentsInput.configPath,
      ...(extractDraftComponentsInput.baseBranch === undefined
        ? {}
        : { baseBranch: extractDraftComponentsInput.baseBranch }),
      useTsConfig: extractDraftComponentsInput.useTsConfig,
    })
  }

  if (extractDraftComponentsInput.sourceMode === 'files') {
    return loadSelectedFiles({
      configPath: extractDraftComponentsInput.configPath,
      filePaths: extractDraftComponentsInput.files ?? [],
      useTsConfig: extractDraftComponentsInput.useTsConfig,
    })
  }

  return loadFullProject({
    configPath: extractDraftComponentsInput.configPath,
    useTsConfig: extractDraftComponentsInput.useTsConfig,
  })
}
