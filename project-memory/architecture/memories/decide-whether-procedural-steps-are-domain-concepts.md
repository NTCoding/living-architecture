---
status: approved
dateAdded: 2026-08-24
systemAreas:
  - global
  - riviere-extract-ts
architectureConcepts:
  - component-responsibility
  - riviere-role-understanding
  - trade-off-reasoning
source: conversation: modelling the connection detection domain service cluster
---

# Decide whether procedural steps are domain concepts

## Memory

### Start with the actual structural problem

The connection detection role errors came from one domain capability implemented
as a procedural pipeline of exported domain services:

```text
RiviereProject
  -> detectConfiguredConnections
       -> detectPerModuleConnections
            -> buildCallGraph
            -> resolveHttpLinks
       -> detectCrossModuleConnections
            -> detectEventPublisherConnections
            -> detectSubscribeConnections
       -> deduplicateCrossStrategy
```

The role errors were a modelling signal. The files had been divided by
algorithm steps, then each exported step had been called a domain service. That
created domain services which coordinated other domain services.

### Verify names against what the code represents

An initial interpretation proposed a generic `CallGraph` value object solely
because the main function was named `buildCallGraph`. That reasoning was a dead
end. The function did not materialise a graph of code calls. It traversed
TypeScript calls, collapsed noncomponent calls, and returned detected
architectural links.

Further repository evidence showed that the approved Phase 12 model already
defined a more precise `ScopedCallGraph`: a method-level graph built by tracing
outward from known components, then collapsed into component-level connections.
The current implementation lost that internal representation by combining graph
construction and connection detection in one function.

The lesson is not that a scoped call graph is an invalid concept. The lesson is
that a misleading implementation name cannot establish it. The concept becomes
valid only when the model actually represents the method calls and preserves the
scoping and traversal invariants described by the domain.

The distinction is:

```text
TypeScript calls
  -> build a scoped method-level call graph
  -> provide evidence for synchronous connection detection
  -> produce detected architectural connections
```

A name in existing code is evidence, not proof of a domain concept. Check the
inputs, output, represented state, and protected invariants before promoting the
name into the model.

### Keep the process and its result separate

A value object represents the result. It must not conceal the full process that
extracts information from TypeScript code. A constructor or parser which
performs TypeScript traversal is doing domain service work, even if it returns a
value object.

The correct general relationship is:

```text
domain service
  -> performs the domain operation
  -> returns a value object representing the result
```

### Preserve current behaviour unless a bug changes the model

Connection detection currently behaves as one atomic operation. In strict mode,
a failure in one detection mechanism rejects the whole result. In lenient mode,
uncertainty is recorded in the complete result. Preserve that behaviour while
remodelling unless evidence reveals a bug. If a bug would change the model, fix
it during the remodelling; otherwise defer unrelated behavioural changes.

The capability is currently 100 percent TypeScript focused. Another language
would probably belong to another subdomain. Do not introduce a language neutral
port or abstraction for hypothetical language support.

### Separate the domain result from operational observations

The current connection detection domain services call `performance.now()` and
include elapsed time in their results. This violates the domain service purity
contract: the same domain inputs can return different results. It is a confirmed
bug in the current model, not merely a role annotation problem.

The timing behaviour cannot simply be deleted. Phase 12 requires duration by
phase and the CLI exposes it through `--stats`. The remodelling must therefore
preserve the operational observation while removing time measurement from pure
domain services. Do not expose procedural domain operations merely to make them
easy for an outer layer to time; that would let instrumentation dictate the
domain interface.

### Test whether implementation divisions are domain boundaries

Current code processes synchronous calls and HTTP links per configured module
source, while asynchronous event relationships are processed across all
components. Do not assume that `per module` and `cross module` are domain
concepts merely because functions and files use those names.

The exact modelling question is:

> The important question is: is that distinction a domain rule, or merely how
> the TypeScript projects and source files must be processed?

Ask:

> Would someone describe these as “module connection detection” and “cross
> module connection detection”, or simply “connection detection” implemented
> using several source contexts?

The reusable decision test is:

> **are these multipole concepts that should be made more explicit, or folded
> into the same concept and treated as one unit**

Do not decide from file structure, function names, or the need to satisfy a
line limit. Use domain meaning, independent behaviour, failure semantics,
consumers, and lifecycle to determine whether the divisions are real concepts.

### Revisit classifications when the ownership model changes

The connection detection functions were originally classified when
`riviere-extract-ts` had no aggregate. Almost every library function was called
a domain service. `RiviereProject` was introduced later, but the existing
procedural service graph was not remodelled around the new owner.

The five whys for the service chain are:

1. Domain services depend on domain services because the algorithm was split
   into exported helper functions.
2. The helpers were exported because the implementation exceeded one cohesive
   file.
3. The implementation exceeded one file because compiler fact extraction,
   type based resolution, graph traversal, graph collapse, and result assembly
   were combined.
4. Those responsibilities remained combined because the approved
   `ScopedCallGraph` representation was never materialised in the code.
5. The original role classification described a library of free functions;
   when `RiviereProject` later became the aggregate owner, that classification
   was not revisited.

Role annotations must be reconsidered when a new aggregate changes ownership.
An annotation that was plausible before the aggregate existed is not evidence
that the same responsibility should remain a service.

### Keep aggregate state encapsulated even when the library model is mutable

`ExtractionStage` currently exposes `ts-morph Project` instances through its
public `moduleContexts`, and `RiviereProject` publicly exposes the stage. A
readonly reference does not make the referenced compiler model immutable.
Consumers can therefore mutate aggregate state without invoking aggregate
behaviour.

This is a real encapsulation bug. The TypeScript compiler model may remain part
of this TypeScript-specific domain, but mutable source state must remain private
to its aggregate owner. Do not introduce a language-neutral port merely because
the implementation uses `ts-morph`; other languages are expected to have their
own subdomains. Separate raw compiler facts from domain decisions instead.

### Internal concepts still improve the model

Domain concepts exist to help people understand the domain and make changes
more safely. Most of a domain model remains internal. A concept does not need an
independent external consumer or a public result type to justify clear domain
language inside an aggregate.

For connection detection, names such as `connectionsDetectedFromCalls` and
`connectionsDetectedFromEvents` are explicit descriptions of intermediate
results. They are difficult to misunderstand or misuse, and they let the
aggregate describe exactly what its atomic connection detection operation does.

Do not manufacture a named value-object class for every intermediate value.
Use a value object when the result has data, equality, validation, or invariants
that need an owner. Otherwise, an explicit local name can carry the domain
meaning honestly.

The emerging aggregate story is:

```ts
const connectionsDetectedFromCalls = detectConnectionsFromCalls(...)
const connectionsDetectedFromEvents = detectConnectionsFromEvents(...)
const resolvedHttpConnections = resolveHttpConnections(...)

return ConnectionDetectionResult.parse({
  // combine the complete atomic result
})
```

This is aggregate behaviour describing one domain operation. It is not evidence
that the intermediate results must be exposed to consumers.

### Recognise flattened entity relationships

During the enrichment discussion, a proposed aggregate operation accepted this
input:

```ts
draftsByModule: ReadonlyMap<string, readonly DraftComponent[]>
```

The problem was not that this private input exposed a procedural intermediate
or weakened the aggregate boundary. That analysis was unsupported. The map
passed a module identity separately from the draft components linked to that
identity. This is a basic entity signal.

The missing concept was `RiviereModule` as an aggregate entity. It owns its
module identity, source context, and associated draft components. Passing the
identity and its children separately discards that ownership and makes callers
reconstruct it. Starting from a component entity therefore put the ownership
boundary in the wrong place.

### Do not duplicate published language knowledge in consumers

A proposed `RiviereModule` implementation accepted a component type as
`string`, then repeated every built-in component type in a local switch. The
default branch meant a new published component type could be accepted by the
compiler and silently treated as an unknown custom type.

This is invalid even when the copied names match the current published
language. The consumer has created a second, weaker definition of the language.

Resolution of extensible strings belongs on the published language API. Closed
variant handling in a consumer must be exhaustive against the imported
published language union. Use a `never` check or an exhaustive
`satisfies Record<PublishedUnion, ...>` so a language change breaks compilation
until every consumer is updated. Never use a string-typed default branch to
absorb future published language variants.

Make the published language more type safe for consumers. When its external
syntax uses structural alternatives, its parser should produce a discriminated
validated type. Consumers can then match the imported discriminant exhaustively
without copying raw property names from the external language. Exhaustive
matching must use a domain-specific error for invalid runtime values; a generic
`Error` is forbidden.

## Why this matters

Without this test, procedural decomposition can be mistaken for domain
decomposition. That produces chains of services, misleading value objects, or
new roles that legitimise the current algorithm instead of improving the model.

The reverse mistake is also possible: folding independently meaningful concepts
into one large operation hides their language, rules, and evolution. The task is
to discover whether the distinction belongs to the domain or only to the
implementation.

## Consider this when

- role errors reveal services calling services;
- a large algorithm is already split across several files;
- function names appear to suggest missing domain concepts;
- several processing strategies contribute to one result;
- the 400 line rule exposes pressure to find honest responsibility boundaries.

## Do not apply automatically when

- the candidate concepts already have independently confirmed consumers,
  lifecycles, rules, or failure semantics;
- a confirmed bug means the current behaviour cannot be preserved;
- the discussion concerns another language subdomain with different domain
  semantics.

## Clarify with the user when

- it is unclear whether partial results remain valid after one mechanism fails;
- a code name does not match the value the code returns;
- a distinction may be either a domain rule or a source processing constraint;
- future language support is being used to justify an abstraction that has no
  current consumer.

## Related references

- `.agents/skills/ddd/SKILL.md`
- `.riviere/role-definitions/domain-service.md`
- `packages/riviere-extract-ts/domain-model/src/domain/connection-detection/detect-configured-connections.ts`
- `packages/riviere-extract-ts/domain-model/src/domain/connection-detection/detect-connections.ts`
- `packages/riviere-extract-ts/domain-model/src/domain/connection-detection/call-graph/build-call-graph.ts`
