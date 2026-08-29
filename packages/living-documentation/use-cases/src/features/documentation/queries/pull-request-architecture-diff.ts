import type { ArchitectureDiff } from '@living-architecture/living-documentation-domain-model/domain/architecture'

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

  changes(): ReturnType<ArchitectureDiff['changes']> {
    return this.diff.changes()
  }
}
