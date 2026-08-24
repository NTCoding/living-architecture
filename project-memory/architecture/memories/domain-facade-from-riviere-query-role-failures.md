---
status: approved
dateAdded: 2026-08-24
systemAreas:
  - global
  - riviere-query
  - riviere-builder
architectureConcepts:
  - boundary-placement
  - component-responsibility
  - project-conventions
  - riviere-role-understanding
  - trade-off-reasoning
source: conversation: deriving the domain facade role from RiviereQuery role failures
---

# Case study: deriving a domain facade from role failures

## Memory

### Start with the error cluster, not individual violations

The role check initially reported 311 errors. `RiviereQuery` accounted for a cluster of 26 errors: one missing `domain-service` justification and 25 forbidden dependencies on other domain services.

These were not 26 independent code defects. They came from one incorrect role classification.

Group role failures by declaration, responsibility, and dependency shape before changing annotations or imports. A large cluster around one declaration can expose a missing architectural concept.

In this case:

- removing the internal `RiviereBuilder.query()` path reduced the count from 311 to 309;
- introducing the approved `domain-facade` role reduced it from 309 to 283;
- the facade resolved all remaining `RiviereQuery` role errors.

### Role definitions constrain the available explanations

Changing `RiviereQuery` to `query-model` was invalid because query models cannot live in the domain model under the current architecture.

Keeping it as a `domain-service` was also invalid because domain services cannot depend on other domain services.

The useful question was therefore not “which existing annotation makes the errors disappear?” It was “what responsibility does this component have that the current role model cannot express?”

Role failures can reveal an anti-pattern in the code, an incorrect classification, or a missing role. Do not assume which one applies before examining the responsibility.

### Distinguish an independent capability from a consumer interface

An independent domain service owns a domain capability that remains meaningful by itself.

A facade has a different purpose. It gives particular types of consumers one stable, versioned API over several related domain capabilities. It removes the need for those consumers to discover those capabilities and assemble them correctly.

Calling the services independently did not meet the requirement because consumers deliberately depended on the consolidated `RiviereQuery` interface. Preserving that consumer experience was a fixed constraint.

A facade is not justified merely because several functions exist. The consumer types and their assembly burden must be concrete.

### The 400 line rule is a modelling signal

The 400 line limit does not justify splitting one responsibility into arbitrary helper files.

Anything larger than 400 lines indicates a missing domain concept. The task is to identify that concept and its responsibility, not to invent a role that permits declarations to be spread across files.

Inlining all query services into `RiviereQuery` would violate the limit and erase meaningful query capabilities. Allowing one component to own arbitrary declarations across several files would instead create an escape hatch.

`GraphInspection` must not be described as a private part of `RiviereBuilder` merely because it was split out to satisfy the line limit. Its correct role remains a separate modelling question. The only decision made here was that constructing `RiviereQuery` did not belong in `GraphInspection` or `RiviereBuilder`.

### Keep the facade for consumers

A domain facade exists to help consumers. It must not become an internal dependency of the same domain model.

`RiviereBuilder.query()` allowed the aggregate and its internal collaborators to construct the facade. That increased the potential for the facade to become an internal coordination mechanism.

The accepted boundary was:

```ts
const builder = repository.load(path)
const query = new RiviereQuery(builder.build())
```

The consumer constructs the facade from the published graph. `RiviereBuilder` does not expose or construct it.

The consumer keeps the consolidated `RiviereQuery` API. It does not have to find or assemble individual query services.

### Approved domain facade contract

The initial contract is deliberately strict:

- target: class only;
- approved instance: `RiviereQuery`;
- justification required;
- instance data is optional;
- any instance data must be private and readonly;
- allowed dependencies are `domain-service`, `domain-error`, and every published language role;
- allowed consumers are `command-use-case`, `query-model`, and `query-model-value`;
- aggregate, domain event, domain port, and another domain facade are excluded for now;
- static data members are not constrained yet;
- unclassified dependencies are not constrained yet;
- callable data members are allowed because domain services can be supplied as fields;
- no minimum public method count is required;
- methods may return results;
- a facade may coordinate several domain services.

The absence of a current restriction is not evidence that the behaviour is permanently valid. Add a restriction when a concrete problem provides enough evidence to design it correctly.

### Put consumer restrictions on the consumed role

Adding `domain-facade` to the forbidden dependencies of every internal domain role would not scale.

The facade owns its consumer whitelist:

```ts
allowedDependentRoles: [
  'command-use-case',
  'query-model',
  'query-model-value',
]
```

This target owned rule means new or existing roles cannot consume a facade unless the facade explicitly allows them.

Use a whitelist when the valid consumers are known and the purpose depends on restricting access.

### Dependency groups must have one canonical definition

The facade can depend on every published language role.

The published language role names must therefore come from one reusable group. Duplicating the individual role names in the facade configuration would allow the lists to drift when a published language role is added or removed.

### Justification must ask a useful question

`requiresJustification: true` is not a valid design. It only asks an agent to add arbitrary text.

The rule must contain the question that the agent has to answer:

```ts
requiresJustification:
  'Which types of consumers need this facade, and why do they need one stable domain interface over these related capabilities instead of using the capabilities directly?'
```

The question challenges both the intended consumers and whether their discovery or assembly burden is real.

Explicit approval remains necessary because automated validation can require an answer but cannot determine whether the reasoning is true.

### Start with stronger constraints

When introducing a role, prefer the strongest constraints supported by current evidence. Loosen them only when a concrete valid case proves that a restriction blocks legitimate code.

Do not respond to an uncertain or challenged constraint by deleting it or making the role unrestricted. Stop and clarify the contract.

An omitted dependency allowlist is not a neutral choice. It creates an escape hatch.

### Stable API does not mean data contract

A domain facade provides behaviour through a stable, versioned API. It does not define a data contract merely because published language types cross its boundary.

The facade remains in the domain model for now. Its future public placement was deliberately deferred. Possible future options include implementing it in the domain and re exporting it through published language, or introducing special published language import rules. Neither option is approved.

## Why this matters

Role enforcement is useful when it exposes a responsibility that the architecture cannot currently express. Treating every error independently would have encouraged inlining, consumer assembly, arbitrary helper roles, or unrestricted dependencies.

Following the cluster back to its responsibility preserved the consolidated consumer API and produced a role with explicit limits against internal use and dependency growth.

## Consider this when

- one declaration causes many role dependency errors;
- consumers need one stable API over several related domain capabilities;
- reclassifying a declaration would contradict its permitted layer;
- fixing a file size error appears to require arbitrary helpers;
- a new role needs source and target dependency restrictions;
- a justification rule could be satisfied with meaningless text.

## Do not apply automatically when

- consumers already use one capability directly without discovery or assembly;
- the component owns mutable state, identity, lifecycle, or invariants that suggest an aggregate;
- the component exists only to make a large file smaller;
- internal domain collaborators need the proposed facade;
- the required consumer types or dependency types are not yet known.

## Clarify with the user when

- a new consumer role needs access to a facade;
- a facade needs aggregate, domain event, domain port, facade, or unclassified dependencies;
- static or callable data members cause a concrete problem;
- the facade appears to need mutable state;
- public placement or published language exposure becomes necessary;
- a proposed justification does not identify concrete consumer types and their assembly burden;
- a challenged constraint is not clearly valid or invalid.

## Related references

- `.riviere/role-definitions/domain-facade.md`
- `.riviere/roles.ts`
- `.riviere/role-selection-guide.md`
- `.agents/skills/ddd/SKILL.md`
- `docs/architecture/adr/ADR-002-allowed-folder-structures.md`
- `packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts`
