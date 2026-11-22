# http-request-parser

## Purpose

A function that checks the primitive shape of a JSON request body and returns it as typed input, or a `http-error` that the route sends back as a 400.

## Behavioural Contract

1. Accept the decoded JSON body, which is `unknown`.
2. Check the shape of each field that the route needs: presence, type and any simple bound such as a non-empty string.
3. Return the typed body, or throw a `http-error` when a field is wrong.
4. Do not decide business rules. A slug that is not `[a-z0-9-]+` is a domain rule, so the domain decides it.
5. Have no side effects.

## Example

```typescript
/** @riviere-role http-request-parser */
export function parseCommentBody(body: unknown): CommentOnDocumentBody {
  if (!isRecord(body) || typeof body['quote'] !== 'string') {
    throw new BadRequestBodyError('quote must be a string')
  }
  return { quote: body['quote'], text: readText(body) }
}
```

## Anti-Patterns

- Trimming, normalising or otherwise cleaning a value; the domain does that.
- Loading an epic to check the request against it; that is a command concern.
- Throwing a plain `Error` or a domain error; throw `http-error`.

## Decision Guidance

- Is it about the shape of a JSON body? → `http-request-parser`.
- Is it about whether the value makes sense for the domain? → the command or the value object.
- Is it about turning CLI options into the same input? → `entrypoint-cli-input-parser`.
