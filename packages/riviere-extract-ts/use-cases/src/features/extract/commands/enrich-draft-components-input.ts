/** @riviere-role command-use-case-input */
export type DraftComponentInput = {
  type: string
  name: string
  location: { file: string; line: number }
  domain: string
  module: string
}

/** @riviere-role command-use-case-input */
export interface EnrichDraftComponentsInput {
  allowIncomplete: boolean
  configPath: string
  draftComponentsPath: string
  includeConnections: boolean
  draftComponents?: readonly DraftComponentInput[]
  projectRoot?: string
  output?: string
  useTsConfig: boolean
}
