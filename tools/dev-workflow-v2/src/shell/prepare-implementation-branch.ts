import { createImplementationBranchWorkspace } from '@living-architecture/dev-workflow-v2-use-cases/adapters/git/implementation-branch-workspace'
import { PrepareImplementationBranch } from '@living-architecture/dev-workflow-v2-use-cases/commands/prepare-implementation-branch'
import { createGitBranchClient } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/git/git-branch-client'
import { runPrepareImplementationBranchEntrypoint } from '../features/workflow/entrypoint/prepare-implementation-branch/entrypoint'
import { formatPreparedImplementationBranch } from '../features/workflow/entrypoint/prepare-implementation-branch/prepare-implementation-branch-output'
import { parseImplementationBranchTarget } from '../features/workflow/entrypoint/prepare-implementation-branch/prepare-implementation-branch-target'
import { formatFailedCliResponse } from '../infra/cli/presentation/format-cli-response'
import { writeCliResponse } from '../infra/cli/presentation/write-cli-response'

const git = createGitBranchClient(process.cwd())
const workspace = createImplementationBranchWorkspace(git)

/** @riviere-role main */
runPrepareImplementationBranchEntrypoint({
  formatPreparedImplementationBranch,
  formatFailedCliResponse,
  parseImplementationBranchTarget,
  prepareImplementationBranch: new PrepareImplementationBranch(workspace),
  writeCliResponse,
})
