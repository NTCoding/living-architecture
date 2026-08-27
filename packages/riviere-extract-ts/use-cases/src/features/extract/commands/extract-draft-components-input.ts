export interface ExtractDraftComponentsInput {
  allowIncomplete: boolean
  configPath: string
  includeConnections: boolean
  projectRoot?: string
  sourceFileSelectionRequest:
    | { readonly kind: 'all' }
    | { readonly kind: 'files'; readonly filePaths: readonly string[] }
    | { readonly kind: 'changed'; readonly baseBranch?: string }
  output?: string
  useTsConfig: boolean
}
