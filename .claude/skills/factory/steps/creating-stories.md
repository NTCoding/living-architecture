# Creating stories

Turn `delivery.md` into GitHub issues once delivery planning is approved, then record them.

## Steps

1. Read `delivery.md` and take the stories in order.
2. For each story, `gh issue create` with the story title, the body from `delivery.md`, and the epic's label.
3. Record them all in one call: `pnpm factory stories <epic> --feature M1 901 902 --feature M2 903 904 905`.
4. Change the idea's status to `planned` with `pnpm factory inbox --all` reporting nothing left.
5. Tell Nick the epic is in progress, with a link to each issue.

## Checklist

- [ ] One issue per story, and no issue that `delivery.md` does not have.
- [ ] The issue numbers match the ones you passed to `stories`.
