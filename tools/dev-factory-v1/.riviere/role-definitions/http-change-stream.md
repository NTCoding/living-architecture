# http-change-stream

## Purpose

A function or class that holds the browser connections open and tells each one that a page's files have changed.

## Behavioural Contract

1. Accept a connection from a browser and keep it open with a `text/event-stream` response.
2. Watch the file times of the planning documents and the thread files, or poll them, on a fixed interval.
3. Send one event to every open connection when a file changes.
4. Forget a connection when the browser closes it.

## Example

```typescript
/** @riviere-role http-change-stream */
export function createChangeStream(dependencies: ChangeStreamDependencies) {
  const connections = new Set<ServerResponse>()

  return {
    connect: (response: ServerResponse) => connections.add(response),
    notify: (change: FileChange) => {
      for (const connection of connections) writeEvent(connection, change)
    },
  }
}
```

## Anti-Patterns

- Reading a document to decide whether it changed; it compares file times.
- Holding the content of a page; the browser fetches it.
- Blocking the request handling while it waits for a change.

## Decision Guidance

- Is it about pushing a change to the browser? → `http-change-stream`.
- Is it about answering a request with data? → `http-entrypoint`.
- Is it about the socket itself? → `http-server`.
