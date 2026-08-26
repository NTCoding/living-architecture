import type { SourceLocation as PublishedSourceLocation } from '@living-architecture/riviere-schema-published-language/schema'
import type { EnrichedComponent } from '../value-extraction/enriched-component'
import type { CallSite } from './call-graph/call-graph-types'

/** @riviere-role value-object */
export class TypeScriptSourceLocation {
  declare private readonly brand: 'TypeScriptSourceLocation'
  readonly repository: string
  readonly filePath: string
  readonly lineNumber: number
  readonly methodName: string | undefined

  static parseFromComponent(
    repository: string,
    component: EnrichedComponent,
  ): TypeScriptSourceLocation {
    return new TypeScriptSourceLocation({
      repository,
      filePath: component.location.file,
      lineNumber: component.location.line,
      methodName: undefined,
    })
  }

  static parseFromCallSite(repository: string, callSite: CallSite): TypeScriptSourceLocation {
    return new TypeScriptSourceLocation({
      repository,
      filePath: callSite.filePath,
      lineNumber: callSite.lineNumber,
      methodName: callSite.methodName,
    })
  }

  private constructor(params: {
    repository: string
    filePath: string
    lineNumber: number
    methodName: string | undefined
  }) {
    this.repository = params.repository
    this.filePath = params.filePath
    this.lineNumber = params.lineNumber
    this.methodName = params.methodName
  }

  toPublishedSourceLocation(): PublishedSourceLocation {
    return {
      repository: this.repository,
      filePath: this.filePath,
      lineNumber: this.lineNumber,
      ...(this.methodName === undefined ? {} : { methodName: this.methodName }),
    }
  }
}
