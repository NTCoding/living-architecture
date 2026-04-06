# command-orchestrator

## Purpose
A function that wires together dependencies and delegates to a workflow runner or domain steps. Unlike a command-use-case (which is a class with constructor-injected dependencies and typed input/result), a command-orchestrator is a standalone function that assembles dependencies inline and kicks off execution.

## Behavioral Contract
1. Assemble dependencies (bind external client methods, create step instances)
2. Build or delegate context construction
3. Delegate to a workflow runner or invoke domain steps directly
4. May accept zero parameters or simple options (not required to use command-use-case-input)

## Examples

### Canonical Example
```typescript
/** @riviere-role command-orchestrator */
export function executeCompleteTask(): void {
  const deps = {
    currentBranch: git.currentBranch.bind(git),
    push: git.push.bind(git),
  }
  runWorkflow(buildSteps(deps), () => buildContext(deps))
}
```

## Anti-Patterns

### Common Misclassifications
- **Not a command-use-case**: command-use-cases are classes with constructor injection and typed inputs/outputs. Orchestrators are functions that wire dependencies inline.
- **Not a cli-entrypoint**: entrypoints parse CLI input and call orchestrators. Orchestrators do not know about CLI frameworks.
- **Not a domain-service**: domain services contain pure business logic. Orchestrators wire infrastructure to domain steps.

## Decision Guidance
- **vs command-use-case**: Is it a class with constructor injection and typed input/result? -> command-use-case. Is it a function that wires deps and delegates? -> command-orchestrator
- **vs cli-entrypoint**: Does it parse CLI flags or register commands? -> cli-entrypoint. Does it assemble deps and run workflows? -> command-orchestrator
