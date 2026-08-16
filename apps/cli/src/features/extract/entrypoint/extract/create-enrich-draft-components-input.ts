import type { EnrichDraftComponentsInput } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/enrich-draft-components-input'
import { readFileSync } from 'node:fs'

/** @riviere-role cli-error */
class InvalidDraftComponentsFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidEnrichInputError'
  }
}

function loadDraftComponents(filePath: string): unknown[] {
  const parsed = (() => {
    try {
      return JSON.parse(readFileSync(filePath, 'utf8'))
    } catch {
      throw new InvalidDraftComponentsFileError(`Unable to read draft components: ${filePath}`)
    }
  })()
  if (!Array.isArray(parsed))
    throw new InvalidDraftComponentsFileError(
      `Enrich file does not contain valid draft components: ${filePath}`,
    )
  return parsed
}

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
    draftComponents: loadDraftComponents(enrichPath),
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
