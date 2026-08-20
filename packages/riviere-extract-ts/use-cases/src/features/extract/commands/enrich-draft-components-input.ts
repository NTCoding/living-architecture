/** @riviere-role command-use-case-input */
export interface EnrichDraftComponentsInput {
  allowIncomplete: boolean
  configPath: string
  draftComponentsPath: string
  includeConnections: boolean
  projectRoot?: string
  output?: string
  useTsConfig: boolean
}
