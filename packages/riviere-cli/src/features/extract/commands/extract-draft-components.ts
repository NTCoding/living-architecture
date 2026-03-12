import { ExtractionFieldFailureError } from '../../../platform/infra/cli-presentation/error-codes'
import {
  loadAndValidateConfig,
  resolveSourceFiles,
} from '../../../platform/infra/extraction-config/config-loader'
import { resolveFilteredSourceFiles } from '../../../platform/infra/source-filtering/filter-source-files'
import { getRepositoryInfo } from '../../../platform/infra/git/git-repository-info'
import { loadExtractionProject } from '../infra/repositories/load-extraction-project'
import type { ExtractDraftComponentsInput } from './extract-draft-components-input'
import type { ExtractDraftComponentsResult } from './extract-draft-components-result'

/** @riviere-role command-use-case */
export function extractDraftComponents(
  extractDraftComponentsInput: ExtractDraftComponentsInput,
): ExtractDraftComponentsResult {
  const {
    resolvedConfig, configDir 
  } = loadAndValidateConfig(
    extractDraftComponentsInput.configPath,
  )
  const allSourceFilePaths = resolveSourceFiles(resolvedConfig, configDir)
  const sourceFilePaths = resolveFilteredSourceFiles(
    allSourceFilePaths,
    createSourceFilterOptions(extractDraftComponentsInput),
  )
  const extractionProject = loadExtractionProject({
    configDir,
    resolvedConfig,
    skipTsConfig: !extractDraftComponentsInput.useTsConfig,
    sourceFilePaths,
  })
  const draftComponents = extractionProject.extractDraftComponents()

  if (!extractDraftComponentsInput.includeConnections) {
    return {
      kind: 'draftOnly',
      components: draftComponents,
    }
  }

  const enrichment = extractionProject.enrichDraftComponents(draftComponents)
  if (enrichment.failedFields.length > 0 && !extractDraftComponentsInput.allowIncomplete) {
    throw new ExtractionFieldFailureError(enrichment.failedFields)
  }

  const repositoryInfo = getRepositoryInfo()
  const connectionResult = extractionProject.detectConnections(
    enrichment.components,
    repositoryInfo.name,
    extractDraftComponentsInput.allowIncomplete,
  )

  return {
    kind: 'full',
    components: enrichment.components,
    failedFields: enrichment.failedFields,
    links: connectionResult.links,
    timings: connectionResult.timings,
  }
}

function createSourceFilterOptions(extractDraftComponentsInput: ExtractDraftComponentsInput): {
  base?: string
  files?: string[]
  pr?: boolean
} {
  return {
    ...(extractDraftComponentsInput.baseBranch === undefined
      ? {}
      : { base: extractDraftComponentsInput.baseBranch }),
    ...(extractDraftComponentsInput.files === undefined
      ? {}
      : { files: extractDraftComponentsInput.files }),
    ...(extractDraftComponentsInput.sourceMode === 'pull-request' ? { pr: true } : {}),
  }
}
