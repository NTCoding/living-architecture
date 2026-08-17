import { defineRoutes } from '@nt-ai-lab/deterministic-agent-workflow-cli'

/** @riviere-role external-client-service */
export function defineWorkflowRoutes<TWorkflow, TState>(
  routes: Parameters<typeof defineRoutes<TWorkflow, TState>>[0],
): ReturnType<typeof defineRoutes<TWorkflow, TState>> {
  return defineRoutes<TWorkflow, TState>(routes)
}
