import type { GitRepositoryStatus } from '../../../../platform/infra/external-clients/git/index'
import type { ReadWorkflowGitStatus } from '../../domain/ports/workflow-external-capabilities'

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
