import type { ExtractOptions } from '../../../platform/infra/cli-presentation/extract-validator'
import type { ExtractDraftComponentsInput } from './extract-draft-components-input'

/** @riviere-role command-input-factory */
export function createExtractDraftComponentsInput(
  options: ExtractOptions,
): ExtractDraftComponentsInput {
  return {
    allowIncomplete: options.allowIncomplete === true,
    ...(options.base === undefined ? {} : { baseBranch: options.base }),
    configPath: options.config,
    ...(options.files === undefined ? {} : { files: options.files }),
    includeConnections: !shouldStopAtDraftComponents(options),
    ...(options.output === undefined ? {} : { output: options.output }),
    sourceMode: readSourceMode(options),
    useTsConfig: options.tsConfig !== false,
  }
}

function shouldStopAtDraftComponents(options: ExtractOptions): boolean {
  return options.dryRun === true || options.format === 'markdown' || options.componentsOnly === true
}

function readSourceMode(options: ExtractOptions): 'all' | 'files' | 'pull-request' {
  if (options.pr === true) {
    return 'pull-request'
  }

  return options.files === undefined ? 'all' : 'files'
}
