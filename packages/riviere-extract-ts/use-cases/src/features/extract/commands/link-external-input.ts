/** @riviere-role command-use-case-input */
export interface LinkExternalInput {
  from: string
  graphFileLocation: string
  targetDomain: string | undefined
  targetName: string
  targetUrl: string | undefined
  type: string | undefined
}
