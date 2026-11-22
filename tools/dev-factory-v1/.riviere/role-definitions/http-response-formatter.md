# http-response-formatter

## Purpose

A function that turns the result of a command or a query into the status and the JSON body that the browser receives.

## Behavioural Contract

1. Accept one command result or one query model.
2. Return the status code and the JSON body.
3. Know nothing about the request, the route or the `Request` object.
4. Perform no side effects and write nothing to a stream.

## Example

```typescript
/** @riviere-role http-response-formatter */
export function formatEpic(epic: EpicView): ResponseBody {
  return { status: 200, body: toEpicJson(epic) }
}
```

## Anti-Patterns

- Reading the request to decide the response.
- Doing domain work such as counting the open threads; the query model carries that.
- Writing the response to the socket; the `http-server` does that.

## Decision Guidance

- Does it decide the status and the body of a success? → `http-response-formatter`.
- Does it decide the status and the body of a failure? → `http-error-handler`.
- Does it turn a result into terminal text? → `cli-response-formatter`.
