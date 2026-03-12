import type { ExtractOptions } from '../../../platform/infra/cli-presentation/extract-validator'
import type { EnrichDraftComponentsInput } from './enrich-draft-components-input'

/** @riviere-role command-input-factory */
export function createEnrichDraftComponentsInput(
  options: ExtractOptions,
  enrichPath: string,
): EnrichDraftComponentsInput {
  return {
    allowIncomplete: options.allowIncomplete === true,
    configPath: options.config,
    draftComponentsPath: enrichPath,
    includeConnections: !shouldStopAtDraftComponents(options),
    ...(options.output === undefined ? {} : { output: options.output }),
    useTsConfig: options.tsConfig !== false,
  }
}

function shouldStopAtDraftComponents(options: ExtractOptions): boolean {
  return options.dryRun === true || options.format === 'markdown' || options.componentsOnly === true
}
