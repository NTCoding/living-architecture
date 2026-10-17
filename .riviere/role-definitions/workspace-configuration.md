# workspace-configuration

## Purpose
Defines the workspace an agent works in: its filesystem, its sandbox, and the rules
about which commands it may run.

## Behavioral Contract
1. Declares the workspace, either as a factory function or a class.
2. Writes the deny list inside the step that needs it. There is no lookup of a
   current state, because the step already is the state.
3. Holds no workflow sequencing and no agent instructions.

## Examples

```typescript
/** @riviere-role workspace-configuration */
export function implementationWorkspace(worktreePath: string): Workspace {
  return new Workspace({
    sandbox: new LocalSandbox({ workingDirectory: worktreePath }),
    tools: {
      hooks: {
        beforeToolCall: ({ toolName, input }) =>
          toolName === WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND && refusesPush(input)
            ? { proceed: false, output: 'The workflow pushes the branch, not you.' }
            : undefined,
      },
    },
  })
}
```
