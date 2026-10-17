import { Agent } from '@mastra/core/agent'
import type { Workspace } from '@mastra/core/workspace'
import type { ModelIdentifier } from '@living-architecture/dev-workflow-v3-domain-model'

type ReviewerName = 'architecture-review' | 'code-review' | 'bug-scanner'

/**
 * @riviere-role agent-configuration
 */
export function createReviewerAgent(dependencies: {
  readonly model: ModelIdentifier
  readonly reviewer: ReviewerName
  readonly instructions: string
  readonly workspace: Workspace
}): Agent {
  return new Agent({
    id: dependencies.reviewer,
    name: dependencies.reviewer,
    instructions: dependencies.instructions,
    model: dependencies.model.value(),
    workspace: dependencies.workspace,
  })
}
