import type {
  ExtractDraftComponentsInput,
  SourceFileSelection,
} from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/extract-draft-components-input'

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
  sourceFileSelection: SourceFileSelection = { kind: 'all' },
): ExtractDraftComponentsInput {
  return {
    allowIncomplete: options.allowIncomplete === true,
    ...(options.base === undefined ? {} : { baseBranch: options.base }),
    configPath: options.config,
    ...(options.files === undefined ? {} : { files: options.files }),
    includeConnections: !shouldStopAtDraftComponents(options),
    projectRoot: process.cwd(),
    ...(options.output === undefined ? {} : { output: options.output }),
    sourceFileSelection,
    sourceMode: readSourceMode(options),
    useTsConfig: options.tsConfig !== false,
  }
}

function shouldStopAtDraftComponents(options: ExtractDraftComponentsFactoryInput): boolean {
  return options.dryRun === true || options.format === 'markdown' || options.componentsOnly === true
}

function readSourceMode(
  options: ExtractDraftComponentsFactoryInput,
): 'all' | 'files' | 'pull-request' {
  if (options.pr === true) {
    return 'pull-request'
  }

  return options.files === undefined ? 'all' : 'files'
}
