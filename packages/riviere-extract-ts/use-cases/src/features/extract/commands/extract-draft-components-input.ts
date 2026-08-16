/** @riviere-role command-use-case-input */
export type SourceFileSelection =
  | { readonly kind: 'all' }
  | { readonly kind: 'files'; readonly filePaths: readonly string[] }

export interface ExtractDraftComponentsInput {
  allowIncomplete: boolean
  baseBranch?: string
  configPath: string
  files?: string[]
  includeConnections: boolean
  projectRoot?: string
  sourceFileSelection: SourceFileSelection
  output?: string
  sourceMode: 'all' | 'files' | 'pull-request'
  useTsConfig: boolean
}
