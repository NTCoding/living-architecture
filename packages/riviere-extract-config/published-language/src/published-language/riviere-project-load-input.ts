/** @riviere-role published-language-data-structure */
export interface WorkflowProjectLoadInput {
  readonly kind: 'workflow'
  readonly workflowPath: string
}

/** @riviere-role published-language-data-structure */
export interface ExtractionProjectLoadInput {
  readonly kind: 'extraction'
  readonly projectRoot: string
  readonly configPath: string
  readonly useTsConfig: boolean
  readonly draftComponentsPath?: string
}

/** @riviere-role published-language-data-structure */
export interface GraphProjectLoadInput {
  readonly kind: 'graph'
  readonly graphFileLocation: string
}

/** @riviere-role published-language-union */
export type RiviereProjectLoadInput =
  | WorkflowProjectLoadInput
  | ExtractionProjectLoadInput
  | GraphProjectLoadInput
