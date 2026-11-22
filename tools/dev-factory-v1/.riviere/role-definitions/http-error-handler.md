# http-error-handler

## Purpose

A function that turns a thrown error into the status and the JSON body that the browser receives.

## Behavioural Contract

1. Accept one error, including errors it does not know.
2. Return the status code and the JSON body.
3. Give a known error its own status: a bad request body is a 400, a missing epic is a 404, a refused action is a 409.
4. Give an unknown error a 500, without putting a stack trace or a file path in the body.
5. Perform no side effects.

## Example

```typescript
/** @riviere-role http-error-handler */
export function handleRouteError(error: unknown): ResponseBody {
  if (error instanceof EpicNotFoundError) {
    return { status: 404, body: { error: error.message } }
  }
  return { status: 500, body: { error: 'The factory could not do that.' } }
}
```

## Anti-Patterns

- Logging or reporting the error; that belongs to the `http-server` that catches it.
- Deciding business rules on the way out, such as changing a 409 into a 200.
- Leaking an internal message or a stack trace to the browser.

## Decision Guidance

- Is it about a failure? → `http-error-handler`.
- Is it about a success? → `http-response-formatter`.
- Is it about terminal output? → `cli-error-handler`.
