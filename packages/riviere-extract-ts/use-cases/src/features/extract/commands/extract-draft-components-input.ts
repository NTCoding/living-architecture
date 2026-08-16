/** @riviere-role command-use-case-input */
export interface ExtractDraftComponentsInput {
  allowIncomplete: boolean
  baseBranch?: string
  configPath: string
  files?: string[]
  includeConnections: boolean
  projectRoot?: string
  sourceFileSelection:
    | { readonly kind: 'all' }
    | { readonly kind: 'files'; readonly filePaths: readonly string[] }
  output?: string
  sourceMode: 'all' | 'files' | 'pull-request'
  useTsConfig: boolean
}
