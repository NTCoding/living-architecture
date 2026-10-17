# workflow-definition

## Purpose
Declares the graph of a Mastra workflow: which steps run, in what order, and what each
step hands on.

## Behavioral Contract
1. Declares one workflow, with an input schema and an output schema.
2. Composes steps. It holds no business decision of its own.
3. A step calls one command use case, or one agent. It does not do both.
4. Every step declares the input and the output it expects.

## Examples

```typescript
/** @riviere-role workflow-definition */
export const startImplementation = createWorkflow({
  id: 'start-implementation',
  inputSchema: StartImplementationInput,
  outputSchema: PullRequestReady,
})
  .then(loadIssue)
  .then(prepareBranch)
  .commit()
```
