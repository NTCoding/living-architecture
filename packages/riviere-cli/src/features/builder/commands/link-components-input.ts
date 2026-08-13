/** @riviere-role command-use-case-input */
export interface LinkComponentsInput {
  condition?: string
  from: string
  graphPathOption: string | undefined
  relationshipType?: string
  sourceLocation?: {
    repository: string
    filePath: string
    lineNumber?: number
    columnNumber?: number
  }
  targetDomain: string
  targetModule: string
  targetName: string
  targetType: string
  type: string | undefined
}
