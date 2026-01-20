// Re-export from new locations - will be removed after full restructure
export { GitError } from './platform/infra/external-clients/git-client'
export { GitHubError } from './platform/infra/external-clients/github-rest-client'
export { WorkflowError } from './platform/domain/workflow-execution/workflow-runner'
export { AgentError } from './features/complete-task/domain/steps/run-code-review'
export { ClaudeQueryError } from './platform/infra/external-clients/claude-agent'
