import type { RunArchitectureReviewProbe } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/run-architecture-review-probe'

/** @riviere-role cli-entrypoint-dependencies */
export interface ArchitectureReviewProbeEntrypointDependencies {
  readonly run: RunArchitectureReviewProbe
}

/** @riviere-role cli-entrypoint */
export declare function createArchitectureReviewProbeCommand(
  dependencies: ArchitectureReviewProbeEntrypointDependencies,
): void
