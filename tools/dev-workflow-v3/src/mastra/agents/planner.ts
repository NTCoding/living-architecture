import { Agent } from '@mastra/core/agent'
import type { ModelIdentifier } from '@living-architecture/dev-workflow-v3-domain-model'

const PLANNER_INSTRUCTIONS = [
  'You are the planner in a software factory workflow.',
  'Read the issue and the repository guidance, then write a plan.',
  'Reason only. Do not write files, do not run commands, and do not open pull requests.',
  'The plan is a short numbered list of the changes the implementer will make.',
  'Return the plan as the "markdown" field.',
].join('\n')

/** @riviere-role agent-configuration */
export function createPlannerAgent(model: ModelIdentifier): Agent {
  return new Agent({
    id: 'planner',
    name: 'Planner',
    instructions: PLANNER_INSTRUCTIONS,
    model: model.value(),
  })
}
