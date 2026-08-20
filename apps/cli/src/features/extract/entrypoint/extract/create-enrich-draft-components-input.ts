import type {
  DraftComponentInput,
  EnrichDraftComponentsInput,
} from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/enrich-draft-components-input'

/** @riviere-role command-input-factory-input */
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
  draftComponents: readonly DraftComponentInput[] = [],
): EnrichDraftComponentsInput {
  return {
    allowIncomplete: options.allowIncomplete === true,
    configPath: options.config,
    draftComponents,
    draftComponentsPath: enrichPath,
    includeConnections: !shouldStopAtDraftComponents(options),
    projectRoot: process.cwd(),
    ...(options.output === undefined ? {} : { output: options.output }),
    useTsConfig: options.tsConfig !== false,
  }
}

function shouldStopAtDraftComponents(options: EnrichDraftComponentsFactoryInput): boolean {
  return options.dryRun === true || options.format === 'markdown' || options.componentsOnly === true
}
