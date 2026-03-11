import { ExtractionFieldFailureError } from '../../../platform/infra/cli-presentation/error-codes'
import {
  loadAndValidateConfig,
  resolveSourceFiles,
} from '../../../platform/infra/extraction-config/config-loader'
import { loadDraftComponentsFromFile } from '../../../platform/infra/extraction-config/draft-component-loader'
import { getRepositoryInfo } from '../../../platform/infra/git/git-repository-info'
import type { EnrichDraftComponentsInput } from './enrich-draft-components-input'
import type { EnrichDraftComponentsResult } from './enrich-draft-components-result'
import { createModuleContexts } from '../infra/external-clients/create-module-contexts'
import { detectConnectionsPerModule } from '../domain/detect-connections-per-module'
import { enrichPerModule } from '../domain/enrich-per-module'

/** @riviere-role command-use-case */
export function enrichDraftComponents(
  enrichDraftComponentsInput: EnrichDraftComponentsInput,
): EnrichDraftComponentsResult {
  const {
    resolvedConfig, configDir 
  } = loadAndValidateConfig(enrichDraftComponentsInput.configPath)
  const sourceFilePaths = resolveSourceFiles(resolvedConfig, configDir)
  const moduleContexts = createModuleContexts(
    resolvedConfig,
    configDir,
    sourceFilePaths,
    !enrichDraftComponentsInput.useTsConfig,
  )
  const draftComponents = loadDraftComponentsFromFile(
    enrichDraftComponentsInput.draftComponentsPath,
  )

  if (!enrichDraftComponentsInput.includeConnections) {
    return {
      kind: 'draftOnly',
      components: draftComponents,
    }
  }

  const enrichment = enrichPerModule(moduleContexts, draftComponents, resolvedConfig, configDir)
  if (enrichment.failedFields.length > 0 && !enrichDraftComponentsInput.allowIncomplete) {
    throw new ExtractionFieldFailureError(enrichment.failedFields)
  }

  const repositoryInfo = getRepositoryInfo()
  const connectionResult = detectConnectionsPerModule(
    moduleContexts,
    enrichment.components,
    repositoryInfo.name,
    enrichDraftComponentsInput.allowIncomplete,
  )

  return {
    kind: 'full',
    components: enrichment.components,
    links: connectionResult.links,
    timings: connectionResult.timings,
    failedFields: enrichment.failedFields,
  }
}
