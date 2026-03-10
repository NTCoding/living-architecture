import type { ResolvedExtractionConfig } from '@living-architecture/riviere-extract-config'
import type { DraftComponent } from '@living-architecture/riviere-extract-ts'
import { detectConnectionsPerModule } from './detect-connections-per-module'
import { enrichPerModule } from './enrich-per-module'
import { ExtractionFieldFailureError } from './extraction-errors'
import type { ExtractionExecutionOptions } from './extraction-execution-options'
import { extractDraftComponents } from './extract-draft-components'
import type { ExtractionResult } from './extraction-result'
import type { ModuleContext } from './module-context'

interface PerformExtractionInput {
  options: ExtractionExecutionOptions
  moduleContexts: ModuleContext[]
  resolvedConfig: ResolvedExtractionConfig
  configDir: string
  repositoryName: string
  draftComponents?: DraftComponent[]
}

/** @riviere-role domain-service */
export function performExtraction(input: PerformExtractionInput): ExtractionResult {
  const draftComponents =
    input.draftComponents ??
    extractDraftComponents(input.moduleContexts, input.resolvedConfig, input.configDir)

  if (input.options.dryRun || input.options.format === 'markdown' || input.options.componentsOnly) {
    return {
      kind: 'draftOnly',
      components: draftComponents,
    }
  }

  const allowIncomplete = input.options.allowIncomplete === true
  const enrichment = enrichPerModule(
    input.moduleContexts,
    draftComponents,
    input.resolvedConfig,
    input.configDir,
  )

  if (enrichment.failedFields.length > 0 && !allowIncomplete) {
    throw new ExtractionFieldFailureError(enrichment.failedFields)
  }

  const connectionResult = detectConnectionsPerModule(
    input.moduleContexts,
    enrichment.components,
    input.repositoryName,
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
