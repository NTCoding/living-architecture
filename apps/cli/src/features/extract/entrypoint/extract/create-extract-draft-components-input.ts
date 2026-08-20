import type { ExtractDraftComponentsInput } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/extract-draft-components-input'

type SourceFileSelectionRequest = ExtractDraftComponentsInput['sourceFileSelectionRequest']

/** @riviere-role command-input-factory-input */
interface ExtractDraftComponentsFactoryInput {
  allowIncomplete?: boolean
  base?: string
  componentsOnly?: boolean
  config: string
  dryRun?: boolean
  files?: string[]
  format?: string
  output?: string
  pr?: boolean
  tsConfig?: boolean
}

/** @riviere-role command-input-factory */
export function createExtractDraftComponentsInput(
  options: ExtractDraftComponentsFactoryInput,
  sourceFileSelectionRequest: SourceFileSelectionRequest = { kind: 'all' },
): ExtractDraftComponentsInput {
  return {
    allowIncomplete: options.allowIncomplete === true,
    configPath: options.config,
    includeConnections: !shouldStopAtDraftComponents(options),
    projectRoot: process.cwd(),
    ...(options.output === undefined ? {} : { output: options.output }),
    sourceFileSelectionRequest,
    useTsConfig: options.tsConfig !== false,
  }
}

function shouldStopAtDraftComponents(options: ExtractDraftComponentsFactoryInput): boolean {
  return options.dryRun === true || options.format === 'markdown' || options.componentsOnly === true
}
