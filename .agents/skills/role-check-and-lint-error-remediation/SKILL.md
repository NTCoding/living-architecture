---
name: role-check-and-lint-error-remediation
description: Remediate role-check, role-enforcement, and lint failures by improving the design instead of suppressing the rule. Use when a role annotation, target, dependency, justification, max-lines, complexity, or other lint failure needs a structural fix, especially when failures cluster in one file or one concept.
---

# Remediating role-check and lint failures

Role-check and lint errors are design feedback. Do not see them as constraints to workaround. Step back and review the design.

- Never silence an error or look for hacky workarounds.
- Read the failing role's definition in `.riviere/role-definitions/<role>.md`
  and `.riviere/role-selection-guide.md` before editing. Read every candidate
  role before choosing one.
- Never invent a new role, all role changes require user approval.

Always look in `project-memory/` for related refactoring examples that show how similar errors were previously resolved.

## Find the seam

Errors often indicate responsibilities are not in the right place. A file-length limit is there to avoid responsibilities being mixed together and it's a sign that there is a missing concept, for example.

So the first step is to look for a seam - a boundary to split and carve out responsibilities.

## Technique 1: extract a value object

A value object is the most common seam. Look for one or more pieces of data and the logic for constructing, querying, and modifying. Look for it in the following use-cases (but not only):

- an aggregate, entity, domain service, repository (or other object) has validation and construction logic for one or a group of related fields
- an aggregate, entity, domain service, repository (or other object) needs an input or output data structure for one of it's methods

If the thing you are dealing with involves data, chances are very high that it's a value object. So start there and try to solve the problem with VOs. Look for relevant project memories showing value object refactorings.

### The contract in this repository

Read `.riviere/role-definitions/value-object.md`. The enforced shape is:

### Simple example

A common anti-pattern is when construction + validation are decoupled from the data they operate on.

In this example, the `BookingScheduler` has a method called `parseDateRange`. It validates the inputs then constructs a startDate and endDate variable. The method name alone gives a clue that there is a missing `DateRange` concept.

```typescript
class BookingScheduler {
  schedule(text: string): void {
    const window = this.parseDateRange(text)
    // ... uses window
  }

  private parseDateRange(text: string) {
    // validation and construction that belong to DateRange
    return {
      startDate,
      endDate
    }
  }
}
```

This is an easy and obvious way to split the large file and improve the design by making an implicit concept explicit with a dedicated `DateRange` value object. The `parseDateRange` helper function in the `BookingScheduler` is it's constructor. It becomes a static `parse` method on the new value object.

```typescript
class BookingScheduler {
  schedule(text: string): void {
    const window = DateRange.parse(text)
    // ... uses window
  }
}
```
