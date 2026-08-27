/** @riviere-role command-use-case-input */
export interface LinkHttpInput {
  graphFileLocation: string
  httpMethod: string | undefined
  linkType: string | undefined
  path: string
  targetDomain: string
  targetModule: string
  targetName: string
  targetType: string
}
