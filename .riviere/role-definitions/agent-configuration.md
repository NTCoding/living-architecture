# agent-configuration

## Purpose
Defines one agent for a Mastra workflow: the model it runs on, the tools it may call,
and the instructions it follows.

## Behavioral Contract
1. Declares an agent, either as a factory function or a class.
2. Names the model, and never a default model. The caller supplies it.
3. Names the tools the agent may call. An agent that needs no tools declares none.
4. Holds no workflow sequencing. That is `workflow-definition`.

## Examples

```typescript
/** @riviere-role agent-configuration */
export function plannerAgent(model: ModelIdentifier): Agent {
  return new Agent({ id: 'planner', model: model.value(), instructions: PLANNER_INSTRUCTIONS })
}
```
