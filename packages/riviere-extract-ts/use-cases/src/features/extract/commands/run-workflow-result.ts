import type { RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'

/** @riviere-role command-use-case-result */
export interface RunWorkflowResult {
  readonly result:
    | {
        readonly kind: 'success'
        readonly graph: RiviereGraph
        readonly outputPath: string
        readonly runLogDirectory: string
      }
    | {
        readonly kind: 'extractionFailure'
        readonly reason: string
        readonly failedFields: readonly string[]
      }
    | {
        readonly kind: 'configFailure'
        readonly code: 'CONFIG_NOT_FOUND' | 'VALIDATION_ERROR'
        readonly message: string
      }
    | {
        readonly kind: 'dataAccessFailure'
        readonly code:
          | 'BASE_BRANCH_NOT_FOUND'
          | 'FILE_READ_ERROR'
          | 'GIT_NOT_FOUND'
          | 'NOT_A_REPOSITORY'
          | 'NO_REMOTE'
        readonly message: string
      }
}
