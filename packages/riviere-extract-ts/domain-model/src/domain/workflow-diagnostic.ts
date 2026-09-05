import type { SourceLocation } from '@living-architecture/riviere-schema-published-language/schema'

type WorkflowDiagnosticValue =
  | Readonly<{
      kind: 'missing-field'
      componentId: string
      field: string
    }>
  | Readonly<{
      kind: 'uncertain-link'
      source: string
      target: string
      sourceLocation?: SourceLocation
    }>

/** @riviere-role value-object */
export class WorkflowDiagnostic {
  declare private readonly brand: 'WorkflowDiagnostic'

  static fromMissingField(componentId: string, field: string): WorkflowDiagnostic {
    return new WorkflowDiagnostic({ kind: 'missing-field', componentId, field })
  }

  static fromUncertainLink(input: {
    source: string
    target: string
    sourceLocation?: SourceLocation
  }): WorkflowDiagnostic {
    return new WorkflowDiagnostic({
      kind: 'uncertain-link',
      source: input.source,
      target: input.target,
      ...(input.sourceLocation === undefined ? {} : { sourceLocation: input.sourceLocation }),
    })
  }

  private constructor(readonly value: WorkflowDiagnosticValue) {}
}

export type { WorkflowDiagnosticValue }
