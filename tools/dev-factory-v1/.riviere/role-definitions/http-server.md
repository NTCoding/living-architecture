# http-server

## Purpose

A function or class that owns the listening socket, matches a request to a route, and writes the response back.

## Behavioural Contract

1. Listen on the configured host and port.
2. Reject a request whose `Host` header is not the factory's own, so a page on another site cannot reach it through DNS rebinding.
3. Reject a `POST` whose `Origin` header names another site. A request without an `Origin` header is allowed, so the agent commands pass.
4. Match the method and the path to one `http-entrypoint` and call it.
5. Catch a thrown error, pass it to the `http-error-handler`, and write that body.
6. Write the status, the headers and the body to the socket.

## Example

```typescript
/** @riviere-role http-server */
export function startHttpServer(dependencies: HttpServerDependencies) {
  return createServer((request, response) => {
    const rejection = checkSameMachineRequest(request)
    if (rejection !== undefined) return writeBody(response, rejection)
    return route(request, dependencies.routes)
  })
}
```

## Anti-Patterns

- Deciding what a route does; the `http-entrypoint` does that.
- Reading the target repo, or any file, itself.
- Holding state about the planning documents.

## Decision Guidance

- Is it about sockets, matching or writing a response? → `http-server`.
- Is it about one route? → `http-entrypoint`.
- Is it about telling the browser that a file changed? → `http-change-stream`.
