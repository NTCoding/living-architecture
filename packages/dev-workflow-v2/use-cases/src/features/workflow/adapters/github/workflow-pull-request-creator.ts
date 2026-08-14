import type {
  GithubPullRequest,
  GithubPullRequestCreationInput,
} from '../../../../infra/external-clients/github/create-pull-request'
import type { CreateWorkflowPullRequest } from '@living-architecture/dev-workflow-v2-domain-model/domain/ports/create-pull-request'

/** @riviere-role domain-port-adapter */
export function createWorkflowPullRequestCreator(
  createGithubPullRequest: (input: GithubPullRequestCreationInput) => GithubPullRequest,
): CreateWorkflowPullRequest {
  return (request) => {
    const pullRequest = createGithubPullRequest({
      body: request.body,
      title: request.title,
    })
    return {
      isDraft: pullRequest.isDraft,
      prNumber: pullRequest.prNumber,
      prUrl: pullRequest.prUrl,
    }
  }
}
