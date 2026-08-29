import { ArchitectureSource } from '@living-architecture/living-documentation-domain-model/domain/architecture'
import type { TypescriptWorkspaceReader } from '../../../../infra/external-clients/typescript/typescript-workspace-reader'
import { WorkspaceArchitectureSources } from '../../queries/workspace-architecture-sources'

/** @riviere-role query-model-loader */
export class ArchitectureSourceLoader {
  constructor(private readonly typescriptWorkspace: TypescriptWorkspaceReader) {}

  load(baseWorkspaceRoot: string, headWorkspaceRoot: string): WorkspaceArchitectureSources {
    return WorkspaceArchitectureSources.fromSources(
      ArchitectureSource.from(this.typescriptWorkspace.readArchitectureSnapshot(baseWorkspaceRoot)),
      ArchitectureSource.from(this.typescriptWorkspace.readArchitectureSnapshot(headWorkspaceRoot)),
    )
  }
}
