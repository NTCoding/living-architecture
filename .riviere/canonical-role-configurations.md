# Canonical Role Configurations

These configurations show how roles compose together in standard patterns. When refactoring code to resolve violations, the result MUST match one of these configurations.

## CLI Invoking Command Use Case

### Data Flow

````text
raw CLI args
     │
     ▼
[cli-input-validator]
     │ validated args
     ▼
[command-input-factory]
     │ command-use-case-input
     ▼
[command-use-case] → see: Command Use Case Pattern
     │ command-use-case-result
     ▼
[cli-entrypoint]
     ├── error → [cli-output-formatter] → exit
     │            uses [cli-error] for error codes
     └── success → [cli-output-formatter] → CLI output
```text

### Who Calls Who

The [cli-entrypoint] orchestrates EVERYTHING. It is the only caller.

```text
[cli-entrypoint] calls [cli-input-validator]     ← validates raw CLI args/options
[cli-entrypoint] calls [command-input-factory]   ← builds typed input from validated args
[cli-entrypoint] calls [command-use-case]        ← executes with typed input
[cli-entrypoint] calls [cli-output-formatter]    ← formats result or error
````

The [command-use-case] does NOT call any of the above. It receives input and returns a result. That's it.

## Command Use Case loading, invoking, and saving aggregate

```text
[*-entrypoint]
     │ [command-use-case-input]
     ▼
[command-use-case]
     │
     ▼
[aggregate-repository] load
     │ [aggregate]
     ▼
aggregate method
     │ modified [aggregate]
     ▼
[aggregate-repository] save
     │
     ▼
[command-use-case-result] → [*-entrypoint]
```

## CLI Invoking Query Model Use Case

### Data Flow

```text
raw CLI args
     │
     ▼
[cli-input-validator]
     │ validated args
     ▼
[cli-entrypoint]
     │ query-model-use-case-input
     ▼
[query-model-use-case] → see: Query Model Use Case Pattern
     │ query-model
     ▼
[cli-entrypoint]
     ├── error → [cli-output-formatter] → exit
     │            uses [cli-error] for error codes
     └── success → [cli-output-formatter] → CLI output
```

### Who Calls Who

Same as the command pattern: [cli-entrypoint] orchestrates everything.

## Query Model Use Case loading and querying a query model

```text
[*-entrypoint]
     │ [query-model-use-case-input]
     ▼
[query-model-use-case]
     │
     ▼
[query-model-loader] load
     │ [query-model]
     ▼
query-model method(s)
     │
     ▼
[query-model] → [*-entrypoint]
```

Key difference from commands: there is no save step. The query model is loaded, queried, and the result is returned. The query model is never modified.
