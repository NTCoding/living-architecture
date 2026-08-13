/** @riviere-role command-use-case-input */
export interface LinkExternalInput {
  from: string
  graphPathOption: string | undefined
  targetDomain: string | undefined
  targetName: string
  targetUrl: string | undefined
  type: string | undefined
}
