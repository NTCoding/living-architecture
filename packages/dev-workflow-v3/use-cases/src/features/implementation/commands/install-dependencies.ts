import type { InstallDependencies as InstallDependenciesPort } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/install-dependencies'

/** @riviere-role command-use-case-input */
export interface InstallDependenciesInput {
  readonly worktreePath: string
}

/** @riviere-role command-use-case-result */
export interface InstallDependenciesResult {
  readonly worktreePath: string
}

/** @riviere-role command-use-case */
export class InstallDependencies {
  constructor(private readonly installDependencies: InstallDependenciesPort) {}

  async execute(input: InstallDependenciesInput): Promise<InstallDependenciesResult> {
    await this.installDependencies({ worktreePath: input.worktreePath })
    return { worktreePath: input.worktreePath }
  }
}
