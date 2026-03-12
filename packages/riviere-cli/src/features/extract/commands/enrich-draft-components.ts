import { ExtractionFieldFailureError } from '../../../platform/infra/cli-presentation/error-codes'
import {
  loadAndValidateConfig,
  resolveSourceFiles,
} from '../../../platform/infra/extraction-config/config-loader'
import { loadDraftComponentsFromFile } from '../../../platform/infra/extraction-config/draft-component-loader'
import { getRepositoryInfo } from '../../../platform/infra/git/git-repository-info'
import { loadExtractionProject } from '../infra/repositories/load-extraction-project'
import type { EnrichDraftComponentsInput } from './enrich-draft-components-input'
import type { EnrichDraftComponentsResult } from './enrich-draft-components-result'

/** @riviere-role command-use-case */
export function enrichDraftComponents(
  enrichDraftComponentsInput: EnrichDraftComponentsInput,
): EnrichDraftComponentsResult {
  const {
    resolvedConfig, configDir 
  } = loadAndValidateConfig(enrichDraftComponentsInput.configPath)
  const sourceFilePaths = resolveSourceFiles(resolvedConfig, configDir)
  const extractionProject = loadExtractionProject({
    configDir,
    resolvedConfig,
    skipTsConfig: !enrichDraftComponentsInput.useTsConfig,
    sourceFilePaths,
  })
  const draftComponents = loadDraftComponentsFromFile(
    enrichDraftComponentsInput.draftComponentsPath,
  )

  if (!enrichDraftComponentsInput.includeConnections) {
    return {
      kind: 'draftOnly',
      components: draftComponents,
    }
  }

  const enrichment = extractionProject.enrichDraftComponents(draftComponents)
  if (enrichment.failedFields.length > 0 && !enrichDraftComponentsInput.allowIncomplete) {
    throw new ExtractionFieldFailureError(enrichment.failedFields)
  }

  const repositoryInfo = getRepositoryInfo()
  const connectionResult = extractionProject.detectConnections(
    enrichment.components,
    repositoryInfo.name,
    enrichDraftComponentsInput.allowIncomplete,
  )

  return {
    kind: 'full',
    components: enrichment.components,
    failedFields: enrichment.failedFields,
    links: connectionResult.links,
    timings: connectionResult.timings,
  }
}
