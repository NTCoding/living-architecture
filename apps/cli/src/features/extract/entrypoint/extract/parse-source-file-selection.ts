import type { ExtractDraftComponentsInput } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/extract-draft-components-input'

type SourceFileSelectionRequest = ExtractDraftComponentsInput['sourceFileSelectionRequest']

export interface SourceFileSelectionParserInput {
  readonly base?: string
  readonly files?: readonly string[]
  readonly pr?: boolean
}

/** @riviere-role entrypoint-cli-input-parser */
export function parseSourceFileSelection(
  input: SourceFileSelectionParserInput,
): SourceFileSelectionRequest {
  if (input.pr === true)
    return { kind: 'changed', ...(input.base === undefined ? {} : { baseBranch: input.base }) }
  if (input.files !== undefined) return { kind: 'files', filePaths: input.files }
  return { kind: 'all' }
}
