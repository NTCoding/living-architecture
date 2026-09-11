import type {
  GithubPullRequest,
  GithubPullRequestCreationInput,
} from '../../../../infra/external-clients/github/create-pull-request'
import type { CreateWorkflowPullRequest } from '@living-architecture/dev-workflow-v2-domain-model/domain/ports/create-pull-request'

/** @riviere-role domain-port-adapter */
export function createWorkflowPullRequestCreator(
  createGithubPullRequest: (input: GithubPullRequestCreationInput) => GithubPullRequest,
  pushBranch: (branch: string) => void,
): CreateWorkflowPullRequest {
  return (request) => {
    pushBranch(request.branch)
    const pullRequest = createGithubPullRequest({
      branch: request.branch,
      body: request.body,
      title: request.title,
      draft: false,
    })
    return {
      prNumber: pullRequest.prNumber,
      prUrl: pullRequest.prUrl,
    }
  }
}
