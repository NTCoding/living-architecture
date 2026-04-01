import type { EnrichDraftComponentsInput } from './enrich-draft-components-input'

interface EnrichDraftComponentsFactoryInput {
  allowIncomplete?: boolean
  componentsOnly?: boolean
  config: string
  dryRun?: boolean
  format?: string
  output?: string
  tsConfig?: boolean
}

/** @riviere-role command-input-factory */
export function createEnrichDraftComponentsInput(
  options: EnrichDraftComponentsFactoryInput,
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

function shouldStopAtDraftComponents(options: EnrichDraftComponentsFactoryInput): boolean {
  return options.dryRun === true || options.format === 'markdown' || options.componentsOnly === true
}
