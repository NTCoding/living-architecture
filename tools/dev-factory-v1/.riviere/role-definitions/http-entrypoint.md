# http-entrypoint

## Purpose

A function that wires one HTTP route: it turns a request into the input of a command or a query, calls it, and turns the result into a response.

## Behavioural Contract

1. **Declare** the route, its method and its path.
2. **Parse** the request body with an `http-request-parser` when the route takes one.
3. **Translate** the parsed body and the path parameters into a command input, often via a `command-input-factory`.
4. **Invoke** exactly one command or query use case.
5. **Format** the result with an `http-response-formatter`, or the thrown error with an `http-error-handler`.
6. **Receive dependencies** as its single parameter, assembled by the composition root.

This is the thinnest possible layer between a request and the domain.

## Example

```typescript
/** @riviere-role http-entrypoint */
export function createStartRunRoute(dependencies: StartRunRouteDependencies) {
  return async (request: Request): Promise<Response> => {
    const body = dependencies.parseStartRunBody(await request.json())
    const result = await dependencies.startRun.execute(body)
    return dependencies.formatRunStarted(result)
  }
}
```

## Anti-Patterns

- **Not a command-use-case**: an entrypoint does not load aggregates or hold domain logic.
- **Not a http-response-formatter**: an entrypoint calls the formatter but does not build the body itself.
- Calling 2 use cases in a row; a route does one thing.
- Reaching into the filesystem or the Mastra instance directly.

## Decision Guidance

- Does it know about HTTP, methods and status codes? → `http-entrypoint`.
- Does it only turn a body into a command input? → `command-input-factory`.
- Does it decide the status and the JSON body? → `http-response-formatter` or `http-error-handler`.
