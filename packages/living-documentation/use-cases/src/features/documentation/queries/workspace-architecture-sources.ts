import type { ArchitectureSource } from '@living-architecture/living-documentation-domain-model/domain/architecture'

/** @riviere-role query-model */
export class WorkspaceArchitectureSources {
  private constructor(
    readonly base: ArchitectureSource,
    readonly head: ArchitectureSource,
  ) {}

  static fromSources(
    base: ArchitectureSource,
    head: ArchitectureSource,
  ): WorkspaceArchitectureSources {
    return new WorkspaceArchitectureSources(base, head)
  }
}
