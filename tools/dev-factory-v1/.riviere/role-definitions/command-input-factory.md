# command-input-factory

## Purpose
A function that translates raw external input (CLI options, HTTP request body) into a typed command-use-case-input.

## Behavioral Contract
1. Accept raw/untyped external data (CLI options object, parsed request body)
2. Validate, transform, and assemble into a typed command-use-case-input
3. Return the typed input — never invoke the command itself
4. Invoke only private helper functions or dependencies supplied as parameters. Do not directly invoke statically imported functions.
5. Have zero external dependencies — no file I/O, no git, no network calls

## Canonical Example
```typescript
/** @riviere-role command-input-factory */
export function createExtractDraftComponentsInput(
  options: CliExtractOptions,
  resolvedConfig: ResolvedConfig,
): ExtractDraftComponentsInput {
  return {
    configPath: resolvedConfig.configPath,
    sourceMode: options.pullRequest ? 'pull-request' : 'full-project',
    allowIncomplete: options.allowIncomplete ?? false,
    includeConnections: options.includeConnections ?? true,
    baseBranch: options.baseBranch,
  }
}
```

## Anti-Patterns

### Common Misclassifications
- **Not a command-use-case**: factories do not load aggregates or invoke domain behavior
- **Not a cli-entrypoint**: entrypoints wire up the full CLI command (register with Commander, call factory, call command, format output). Factories only build the input.

### Resolving a Violation

STOP. Before proceeding classify the type of code you have:

1. Does it contain words from the domain or make domain decisions? It probably lives in the domain.
2. Does it wrap or use external frameworks and APIs, a process, filesystem, database, or network? It is probably an `external-client-service`.
3. Does it rebuild persisted aggregate state or store aggregate state? It is probably an `aggregate-repository`.
4. Does it translate one domain capability to one external client? It is probably a `domain-port-adapter`.
5. Does it only translate raw inbound input into typed application input? It is an entrypoint parser or `command-input-factory`.
6. Does it sequence collaborators that have already been classified? It is a `command-use-case`.

Your code can contain more than one of these roles. Identify the responsibilities first. Extract each responsibility to the role it belongs to. If the extracted parts remain coupled, merge them only where they have one responsibility, then split again at the next role boundary.

After identifying the roles, put the pieces together:

1. An `external-client-service` can be used by a `domain-port-adapter`.
2. A `domain-port-adapter` implements one `domain-port` with one external client.
3. A `command-use-case` passes collaborators to the domain and coordinates their execution. It does not make the domain decision.
4. The domain decides whether it needs an external capability, through a verb named `domain-port`.
5. The input factory or parser supplies a typed request. It does not obtain external facts or make the domain decision.

Read the definitions for every role you identify before moving code. Use their allowed dependency direction to assemble the result. Do not choose a role from one attribute such as the current annotation, return type, or location. The completed code must satisfy every responsibility you classified.

The role configuration describes the constraints that exposed the problem. It is evidence for the classification, not a substitute for the correction. Resolve an application violation by changing the classified application responsibilities and their wiring.

### Mixed Responsibility Signals
- If the factory also calls the command use case — that's entrypoint behavior leaking in
- If the factory does complex domain logic to build the input — some logic may belong in a domain-service
- If the factory directly invokes an imported function — inject that dependency through a parameter instead
- If the factory obtains information needed by the operation, such as changed source files, define a domain port in the domain and implement it with an adapter and external client. The domain calls the port as part of the operation.

## Decision Guidance
- **vs cli-entrypoint**: Does it register CLI commands or call the use case? → cli-entrypoint. Does it only build the input object? → command-input-factory
