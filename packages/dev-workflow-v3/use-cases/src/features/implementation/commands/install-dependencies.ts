import type { WorktreeReference } from '@living-architecture/dev-workflow-v3-domain-model'
import type { InstallDependencies as InstallDependenciesPort } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/install-dependencies'

/** @riviere-role command-use-case-input */
export interface InstallDependenciesInput {
  readonly worktree: WorktreeReference
}

/** @riviere-role command-use-case-result */
export interface InstallDependenciesResult {
  readonly worktreePath: string
}

/** @riviere-role command-use-case */
export class InstallDependencies {
  constructor(private readonly installDependencies: InstallDependenciesPort) {}

  async execute(input: InstallDependenciesInput): Promise<InstallDependenciesResult> {
    await this.installDependencies({ worktreePath: input.worktree.path() })
    return { worktreePath: input.worktree.path() }
  }
}
