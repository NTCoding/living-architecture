import type { ReadWorkflowGitStatus } from '@living-architecture/dev-workflow-v2-domain-model/domain/ports/read-git-status'
import type { GitRepositoryStatus } from '../../../../infra/external-clients/git/git-client'

/** @riviere-role domain-port-adapter */
export function createWorkflowGitStatusReader(
  readGitRepositoryStatus: () => GitRepositoryStatus,
): ReadWorkflowGitStatus {
  return () => {
    const status = readGitRepositoryStatus()
    return {
      changedFilesVsDefault: status.changedFilesVsDefault,
      currentBranch: status.currentBranch,
      hasCommitsVsDefault: status.hasCommitsVsDefault,
      headCommit: status.headCommit,
      workingTreeClean: status.workingTreeClean,
    }
  }
}
