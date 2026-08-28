import {
  ArchitectureDiff,
  extractArchitecture,
} from '@living-architecture/living-documentation-domain-model/domain/architecture'
import type { ArchitectureSourceLoader } from '../data-access/architecture-source/architecture-source-loader'
import type { GeneratePullRequestArchitectureDiffInput } from './generate-pr-architecture-diff-input'
import { PullRequestArchitectureDiff } from './pull-request-architecture-diff'

/** @riviere-role query-model-use-case */
export class GeneratePullRequestArchitectureDiff {
  constructor(private readonly architectureSources: ArchitectureSourceLoader) {}

  execute(input: GeneratePullRequestArchitectureDiffInput): PullRequestArchitectureDiff {
    const sources = this.architectureSources.load(input.baseWorkspaceRoot, input.headWorkspaceRoot)
    const architectureDiff = ArchitectureDiff.fromArchitectures(
      extractArchitecture(sources.base),
      extractArchitecture(sources.head),
    )
    return PullRequestArchitectureDiff.fromArchitectureDiff(architectureDiff, input.outputPath)
  }
}
