import type {
  GithubPullRequest,
  GithubPullRequestCreationInput,
} from '../../../../platform/infra/external-clients/github/index'
import type { CreateWorkflowPullRequest } from '../../domain/ports/workflow-external-capabilities'

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
