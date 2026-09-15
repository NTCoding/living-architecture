---
name: role-check-and-lint-error-remediation
description: Remediate role-check, role-enforcement, and lint failures by improving the design instead of suppressing the rule. Use when a role annotation, target, dependency, justification, max-lines, complexity, or other lint failure needs a structural fix, especially when failures cluster in one file or one concept.
---

# Remediating role-check and lint failures

Role-check and lint errors are design feedback. The goal is a better model, not
a quiet tool. Work from the error back to the responsibility that produced it.

## Stance

- Never silence an error. No `eslint-disable`, ignore or exclusion patterns,
  loosened thresholds, coverage suppressions, `--no-verify`, or annotations
  chosen only to make the message go away.
- Do not move an error. A fix that trades one error for another in a different
  file has not fixed anything.
- Read the failing role's definition in `.riviere/role-definitions/<role>.md`
  and `.riviere/role-selection-guide.md` before editing. Read every candidate
  role before choosing one.
- Never invent a new role, folder, generic helper, manager, or orchestrator as
  an escape hatch. Adding a role or reclassifying an aggregate needs explicit
  user approval.
- Fix the whole error cluster. Errors that arrive together usually share one
  responsibility that is in the wrong place.

## Find the seam

An error is often a signal that a concept has no home. The remedy is to find a
seam: a place where a cluster of related data and the functions that build or
query that data can be gathered behind one concept.

A seam lets you:

- shrink the file that is failing, without moving unrelated code;
- give the concept an honest role instead of a forced annotation;
- remove branching and primitive-passing that other files must understand.

Look for a seam when you see:

- a group of fields that always travel together;
- free functions that take that group as their first parameter;
- code in several places that branches on the same field of that group;
- `max-lines` overflow in a file that mixes data shape with the operations
  over it;
- `Role '<x>' does not allow target 'type-alias'` on a data shape that really
  represents a concept;
- a `parseXyz` method inside a service or aggregate, usually private and used
  internally, where `Xyz` is likely the value object it constructs.

## Technique 1: extract a value object

A value object is the most common seam. Data defined by its attributes, plus
the operations that read or build it, belong on one immutable class.

### When it applies

- The data is defined by its values, not by an identity.
- The data is immutable, or can be made immutable.
- Operations over it return new values or primitive answers.
- No lifecycle, repository, or state-modifying invariant is involved.

### Where a value object can be extracted

Three reliable seams:

1. **Data and logic inside an aggregate.** A group of fields or private state
   that always move together, plus the private methods whose only subject is
   that group. Move the fields and those methods into the value object; the
   aggregate keeps one field of the value object and delegates to it.
   - Signal: several private fields read and written together; private helpers
     that touch nothing else; the same invariant re-checked over the same field
     group in more than one method.
   - Result: `private readonly from: Date; private readonly to: Date` with a
     private `spans()` helper becomes `private readonly window: DateRange`, and
     the aggregate calls `this.window.spans(...)`.

2. **Parameters passed into an object.** A method or factory takes several
   parameters that belong together, or the same group is threaded through
   several methods. The group is one concept disguised as separate arguments.
   - Signal: two or more parameters always passed as a set; the same validation
     or normalisation repeated for them at each call site.
   - Result: `schedule(from: Date, to: Date)` becomes
     `schedule(window: DateRange)`, and the group is built once.

3. **Values returned from an object.** A method returns a tuple or an ad hoc
   object of related values, and callers destructure it and recombine the parts
   themselves.
   - Signal: tuple returns; callers reading `result[0]` or rebuilding the same
     combination elsewhere; returned fields that are only ever used together.
   - Result: a method returning `{ from, to }` returns a `DateRange`, and the
     operations over that pair live on it.

If a cluster splits cleanly by which fields change together, it is more than one
value object. Extract one concept at a time.

### The contract in this repository

Read `.riviere/role-definitions/value-object.md`. The enforced shape is:

- a `class`, annotated `/** @riviere-role value-object */`;
- a private constructor;
- `declare private readonly brand: '<ClassName>'`;
- at least one static factory whose name begins with `parse` or `from`, taking
  at least one parameter;
- instance methods are allowed; callable data members are not;
- no `Error` supertype; extra statics are forbidden except `singleton`.

### Simple example

Before, a data shape and the function that queries it live as a loose type and a
free function, and callers branch on the shape's fields:

```typescript
type Temperature = {
  readonly degrees: number
  readonly unit: 'celsius' | 'fahrenheit'
}

function inCelsius(temperature: Temperature): number {
  return temperature.unit === 'celsius'
    ? temperature.degrees
    : (temperature.degrees - 32) * (5 / 9)
}
```

After, the same data and behaviour are one concept with a lawful role:

```typescript
/** @riviere-role value-object */
export class Temperature {
  declare private readonly brand: 'Temperature'

  static from(input: {
    readonly degrees: number
    readonly unit: 'celsius' | 'fahrenheit'
  }): Temperature {
    return new Temperature(input.degrees, input.unit)
  }

  private constructor(
    private readonly degrees: number,
    private readonly unit: 'celsius' | 'fahrenheit',
  ) {}

  inCelsius(): number {
    return this.unit === 'celsius'
      ? this.degrees
      : (this.degrees - 32) * (5 / 9)
  }
}
```

Callers no longer know how the unit is represented. They call
`Temperature.from(input).inCelsius()`.

### How to do it

1. Name the concept in domain language. Do not name it after the mechanism,
   the algorithm, or the current function (not `SelectionHelper` or
   `FileFilter`).
2. Move the fields onto the class. Keep them private unless a consumer genuinely
   needs to read them.
3. Turn the builders into `parse` or `from` factories.
4. Turn the queries into instance methods. The function's first parameter
   becomes `this`.
5. Replace branching at call sites with a method call. Delete the loose type and
   the free functions.
6. Re-run role-check and lint. Confirm the file shrank for a real reason and the
   new class passes the value-object contract.

### Pitfalls

- Annotating a `type` alias as `value-object` fails: the role accepts classes
  only. If it is a data shape, either make it a class or keep it private.
- A factory with no parameters is rejected. Use `singleton` only for a fixed set
  or list, otherwise take the input the factory interprets.
- Do not gather unrelated helpers just to satisfy a line count. A value object
  is one concept.
- Do not reach for an aggregate. If it owns a lifecycle or enforces invariants
  through state changes, it is not a value object.

## Anti-pattern: `parseXyz` inside a service or aggregate

A method named `parseXyz`, usually private, that builds an `Xyz` for the class's
own use is a value object's constructor living in the wrong place. The method
name states the concept; the class that happens to need it is not the concept's
owner.

```typescript
class BookingService {
  schedule(text: string): void {
    const window = this.parseDateRange(text)
    // ... uses window
  }

  private parseDateRange(text: string): DateRange {
    // validation and construction that belong to DateRange
  }
}
```

```typescript
class BookingService {
  schedule(text: string): void {
    const window = DateRange.parse(text)
    // ... uses window
  }
}
```

- Why it is an anti-pattern: the construction and validation rules live outside
  the value, so the concept cannot protect its own invariants. Every other class
  that needs the same value grows its own `parseXyz`, and this class carries a
  responsibility that is not its own. That extra responsibility is a common
  source of role and `max-lines` errors.
- Remedy: extract `Xyz` if it does not exist, give it a private constructor and
  a static `parse` or `from` factory, move the parsing there, and delete the
  method. Replace `this.parseXyz(input)` with `Xyz.parse(input)`.
- Use `parse` when the factory interprets or validates its input, and `from`
  when the input is already valid.
- This applies to the same shape under other names, such as `buildXyz` or
  `createXyz`, when `Xyz` is a value.
- Caveat: move construction onto `Xyz` only when `Xyz` is genuinely a value. If
  it has identity, a lifecycle, or state-changing invariants, it is an entity or
  aggregate, and construction belongs to a factory or repository instead.

## Further techniques

This skill is being built up. Add new proven techniques here as separate
sections, each with the same shape: when it applies, the repository contract,
a simple before and after, how to do it, and pitfalls.
