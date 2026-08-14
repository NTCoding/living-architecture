/** @riviere-role command-use-case-input */
export interface ExtractDraftComponentsInput {
  allowIncomplete: boolean
  baseBranch?: string
  configPath: string
  files?: string[]
  includeConnections: boolean
  output?: string
  sourceMode: 'all' | 'files' | 'pull-request'
  useTsConfig: boolean
}
