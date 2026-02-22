import type { ResolvedExtractionConfig } from '@living-architecture/riviere-extract-config'
import type { DraftComponent } from '@living-architecture/riviere-extract-ts'
import { ExtractionFieldFailureError } from '../../../platform/infra/cli-presentation/error-codes'
import type { ExtractOptions } from '../../../platform/infra/cli-presentation/extract-validator'
import { loadDraftComponentsFromFile } from '../../../platform/infra/extraction-config/draft-component-loader'
import { getRepositoryInfo } from '../../../platform/infra/git/git-repository-info'
import { createModuleContexts } from '../infra/external-clients/create-module-contexts'
import { extractDraftComponents } from '../domain/extract-draft-components'
import { enrichPerModule } from '../domain/enrich-per-module'
import { detectConnectionsPerModule } from '../domain/detect-connections-per-module'
import type { ExtractionResult } from '../domain/extraction-result'

export function runExtraction(
  options: ExtractOptions,
  resolvedConfig: ResolvedExtractionConfig,
  configDir: string,
  sourceFilePaths: string[],
): ExtractionResult {
  const skipTsConfig = options.tsConfig === false
  const moduleContexts = createModuleContexts(
    resolvedConfig,
    configDir,
    sourceFilePaths,
    skipTsConfig,
  )

  const draftComponents: DraftComponent[] =
    options.enrich === undefined
      ? extractDraftComponents(moduleContexts, resolvedConfig, configDir)
      : loadDraftComponentsFromFile(options.enrich)

  if (options.dryRun || options.format === 'markdown' || options.componentsOnly) {
    return {
      kind: 'draftOnly',
      components: draftComponents,
    }
  }

  const allowIncomplete = options.allowIncomplete === true
  const enrichment = enrichPerModule(moduleContexts, draftComponents, resolvedConfig, configDir)

  if (enrichment.failedFields.length > 0 && !allowIncomplete) {
    throw new ExtractionFieldFailureError(enrichment.failedFields)
  }

  const repositoryInfo = getRepositoryInfo()
  const connectionResult = detectConnectionsPerModule(
    moduleContexts,
    enrichment.components,
    repositoryInfo.name,
    allowIncomplete,
  )

  return {
    kind: 'full',
    components: enrichment.components,
    links: connectionResult.links,
    timings: connectionResult.timings,
    failedFields: enrichment.failedFields,
  }
}
