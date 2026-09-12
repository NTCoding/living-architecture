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
  | Readonly<{
      kind: 'unmapped-record'
      recordKind: 'service' | 'event'
      recordId: string
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
      ...(input.sourceLocation === undefined
        ? {}
        : { sourceLocation: { ...input.sourceLocation } }),
    })
  }

  private constructor(readonly value: WorkflowDiagnosticValue) {}

  static fromUnmappedRecord(recordKind: 'service' | 'event', recordId: string): WorkflowDiagnostic {
    return new WorkflowDiagnostic({ kind: 'unmapped-record', recordKind, recordId })
  }
}

export type { WorkflowDiagnosticValue }
