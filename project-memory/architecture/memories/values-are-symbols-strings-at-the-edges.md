---
status: approved
dateAdded: 2026-09-12
systemAreas:
  - global
architectureConcepts:
  - value-object
  - domain-modeling
  - component-responsibility
  - project-conventions
  - riviere-role-understanding
source: conversation: replacing value object static escape hatches in pull request 534
---

# Values are symbols; keep strings and schemas at the edges

## Memory

### The simple principle

The domain is symbols. Construct your program out of symbols and their
relationships. Resort to strings and raw values at the edges.

### The five habits that follow

1. The domain works in symbols.
2. If you need to add a static method to a value object, you do not. You either
   need to construct a value object or get a representation of it. You do not
   need a static method that tries to do both.
3. Symbol creation happens at the edges with methods such as
   `ValueObject.fromName('blah')`.
4. For fixed lists of values, use a singleton value object.
5. If you think you need to access the internal schema of a value object, you
   do not. You probably just need to construct a value object and use the
   result. If something external really does require a Zod schema, the value
   object can expose an `asZodSchema` to avoid duplicating the rules. It might
   not always be ideal, but it is an acceptable compromise.

### Case study: replacing value object static escape hatches

A role enforcement rule now permits static methods on a `value-object` only
when they are construction factories beginning with `parse` or `from`, or the
zero-argument `singleton` accessor. Applying that rule to the existing code
surfaced twelve static methods that were doing something else, and the same
five habits resolved every one of them.

Static data became construction from symbols. `ReviewStatuses.pending()`
returned a hard-coded reviewer status record:

```ts
static pending() {
  return {
    'architecture-review': 'PENDING',
    'code-review': 'PENDING',
    'bug-scanner': 'PENDING',
    'task-check': 'PENDING',
    coderabbit: 'PENDING',
  }
}
```

The initial state now maps reviewer symbols to a status symbol:

```ts
ReviewerStatuses.fromInitialState(
  Reviewers.singleton().all(),
  ReviewerStatus.fromName('PENDING'),
)
```

Construction and validation methods became `parse`/`from` factories.
`WorkflowState.replay(events)` became `WorkflowState.from(events)`,
`RiviereBuilder.new(options)` became `RiviereBuilder.parse(options)`, and
`EnrichmentResult.mergeModuleResults(results)` became
`EnrichmentResult.from(results)`.

Duplicate and misplaced methods were removed or relocated.
`RiviereBuilder.resume(graph)` was deleted because it only forwarded to
`fromGraph`. `RiviereBuilder.graphOptionsFrom(graph)` was moved to
`BuilderOptions.fromGraph(graph)` on the options value object, where it
belongs.

Schema exposure was removed. `Reviewer.schema()`, `ReviewStatuses.schema()`,
and `WorkflowState.stateNameSchema()` exported internal Zod enums. The event
value objects now validate fields with `Reviewer.fromName` and
`ReviewerStatus.fromName`, and a fixed set reaches a schema only through an
instance, for example `StateNames.singleton().asZodSchema()`, because the
workflow engine needs a `ZodType`.

Allowed-value lists moved onto failures. `CommitType.supportedNames()` and
`CustomPropertyType.names()` exposed fixed lists. The `parse` failure now
carries the allowed values, and consumers read them from the failure:

```ts
CustomPropertyType.parse('date')
// { success: false, invalidValue: 'date', validNames: ['string', 'number', ...] }
```

### Edges still produce names

Serialising at the edge is expected and does not contradict the principle.
`WorkflowState` holds symbols and exposes `toJSON()` because the workflow
engine persists state with `JSON.stringify(state)`. The event value objects
likewise carry the values the engine persists. The representation is a name;
the domain remains symbols.

## Why this matters

Value objects are the domain's vocabulary. When a value object grows static
methods that expose schemas, hard-code default records, or list allowed values,
the domain leaks implementation detail and mixes construction with
representation. Those statics are an escape hatch: they look harmless, and
agents reach for them instead of modelling the value honestly. Restricting the
static surface to construction factories and the `singleton` accessor keeps the
domain small, strongly typed, and expressed in symbols.

The habits are simple enough that almost every problem reduces to one of two
questions: am I constructing a value, or am I representing one? Name the
factory, or move the representation to the edge.

## Consider this when

- a value object gains a static method that is not a `parse`/`from` factory or
  the `singleton` accessor;
- code reads a value object's Zod schema, or any other internal representation;
- a value object returns a hard-coded list, record, or default value;
- a value object's static method returns a different type than the value object;
- a method name describes representation, listing, or formatting rather than
  construction.

## Do not apply automatically when

- an external library genuinely requires a schema type, in which case
  `singleton().asZodSchema()` is the accepted compromise;
- the value is serialised at a boundary by design, such as `toJSON()` for
  `JSON.stringify`, and the representation is the edge, not the domain;
- the type is a wire or input shape rather than a domain concept, in which case
  a data structure role applies instead of `value-object`.

## Clarify with the user when

- it is unclear whether a static method constructs a value or represents one;
- a fixed list could reasonably live on a value object, on a failure, or at the
  edge;
- removing a static would change a public API or a serialised shape;
- the correct Rivière role for a helper type is unclear.

## Related references

- `.riviere/role-definitions/value-object.md`
- `.riviere/roles.ts`
- `packages/riviere-role-enforcement/domain-model/role-enforcement-plugin.mjs`
- `packages/dev-workflow-v2/domain-model/src/domain/reviews/reviewer-statuses.ts`
- `packages/dev-workflow-v2/domain-model/src/domain/workflow-types.ts`
- `packages/dev-workflow-v2/domain-model/src/domain/workflow-events.ts`
- `packages/riviere-builder/published-language/src/published-language/riviere-graph-definition-input.ts`
