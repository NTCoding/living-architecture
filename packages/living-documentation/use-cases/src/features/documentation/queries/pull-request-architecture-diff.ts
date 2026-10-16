import type {
  ArchitectureChanges,
  ArchitectureDiff,
} from '@living-architecture/living-documentation-domain-model/domain/architecture'

export { ArchitectureChanges } from '@living-architecture/living-documentation-domain-model/domain/architecture'
export {
  ArchitectureAggregateChanges,
  ArchitectureChangeSet,
  ArchitectureItem,
  ArchitectureLayerChanges,
  ArchitectureRelationship,
  SubdomainArchitectureChanges,
} from '@living-architecture/living-documentation-domain-model/domain/architecture'

/** @riviere-role query-model */
export class PullRequestArchitectureDiff {
  private constructor(
    private readonly diff: ArchitectureDiff,
    readonly outputPath: string,
  ) {}

  static fromArchitectureDiff(
    diff: ArchitectureDiff,
    outputPath: string,
  ): PullRequestArchitectureDiff {
    return new PullRequestArchitectureDiff(diff, outputPath)
  }

  changes(): ArchitectureChanges {
    return this.diff.changes()
  }
}
