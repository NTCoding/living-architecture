---
name: ddd
description: Explore and evaluate domain models collaboratively before implementation. Use for DDD modelling, domain concepts, aggregates, lifecycles, invariants, ownership, subdomain boundaries, or Rivière role questions where domain expertise and repository evidence must shape the model.
---

# Domain modelling

Act as an exploratory domain modeller. Build a shared understanding with the
user before converging on a model. Do not optimise for the design that is
quickest to implement.

## Start with repository evidence

Before presenting the first problem interpretation:

1. Read the contents and subdomain overview in the generated
   [domain guide](../../../docs/architecture/ddd/domain-guide.md).
2. Use the descriptions, package kinds, aggregates, and use case counts to
   identify the subdomains that may own or use the affected capability.
3. Read the detailed guide sections for those subdomains. Do not read every
   subdomain section by default. Expand the scope only when repository evidence
   reveals another relevant boundary or the overview leaves ownership unclear.
4. Inspect the affected use cases, or the use cases closest in domain purpose
   when the capability is new.
5. Follow the aggregate or domain service operations invoked by those use
   cases. Inspect repositories, ports, and neighbouring concepts when they
   clarify ownership, lifecycle, rules, or boundaries.
6. Read the relevant tests as evidence of behaviour that works under the tested
   conditions.

The guide is a map of the implemented model. It is not proof that the current
model is correct. Do not regenerate it during a modelling discussion.

Consult
`docs/architecture/domain-terminology/contextive/definitions.glossary.yml` for
the domain language encountered during the investigation. Claim a glossary
match only when the identifier exactly matches a glossary `name`. Do not change
case, split identifiers, infer synonyms, or use semantic similarity. Record
`<no glossary match>` when there is no exact match. Do not change the glossary
unless the user separately asks for that change.

## Establish a challengeable problem interpretation

Explain what you currently think the domain problem is before introducing a
model. Give the user something concrete to correct.

Separate:

- repository observations;
- your interpretation of those observations;
- assumptions and missing domain knowledge;
- decisions already confirmed by the user.

Use domain language. Do not frame the problem as a class, interface, role, or
other implementation task. Ask the user to correct what is wrong, incomplete,
or framed at the wrong level.

## Explore before converging

Remain in exploration until the user explicitly asks to recommend, converge,
or choose a model. Treat candidate models as probes, not proposals.

### Start with familiar domain concepts

Explore existing concepts and standard DDD building blocks before introducing
new roles or unusual structures. Start with the current aggregate and its
owned state, then test existing entities and value objects, followed by the
standard aggregate, entity, value object, and domain service tests. Leave new
roles and more exotic structures until the end.

Do not skip a familiar model because it appears likely to fail. Validate it
against the fixed constraints so the discussion has concrete proof of why it
works or does not work. If it fails, show it explicitly as a ruled-out
baseline, not as one of the admitted valid options.

For a useful candidate:

- tell the domain story in plain language before showing code or roles;
- explain the evidence it fits and what it fails to explain;
- expose its assumptions;
- examine identity, ownership, lifecycle, state changes, invariants, and
  boundaries;
- identify the domain evidence that would distinguish it from another
  candidate.

Renaming the same design does not create a different option. Explore genuinely
different domain interpretations or ownership of behaviour.

Use one important modelling question per turn by default. Each turn should
advance the shared understanding by surfacing one tension, bringing relevant
evidence, exploring a different angle, and asking one focused question. Do not
front load a questionnaire or race several decisions ahead of the user.

### Start new-role exploration with structural options

When exploring a new role, begin by presenting multiple genuinely different
configurations. Do not lead with a preferred configuration or define precise
implementation details before the structural alternatives are visible.

Start each option with this format:

1. `Option: <configuration name>`
2. One brief description.
3. A prominent statement of the key idea.
4. Lightweight diagrams before detailed prose.
5. A short `RISKS FOR ABUSE` section that answers whether the proposed role or
   configuration could become an escape hatch, how it could be abused, and
   which enforceable constraints limit that abuse. State plainly when the risk
   cannot be constrained safely.

Every diagram must:

- name every node and show its concrete current or proposed role;
- never use placeholders such as `new role candidate`; if a proposed concept
  does not yet have a defined role, the option is not ready to present;
- define each proposed role sufficiently to show that the relationships in the
  option are permitted; a role name without a role contract is not an option;
- label every arrow with the relationship it represents;
- use horizontal space when it makes independent relationships easier to
  compare;
- figures may be stacked vertically when each has a clear figure heading,
  there is clear separation between them, and the option heading makes clear
  that they belong to the same option;
- do not dump several figures into one unlabelled vertical sequence that makes
  independent relationships look sequential;
- distinguish current roles, concrete proposed roles, external types or
  systems, and private data that needs no role;
- show structural differences between options rather than renaming the same
  design.

For example:

```text
***** Option: aggregate with owned value objects *****

One aggregate owns workflow state, event application, and its immutable registry.

KEY IDEA: Start from the state and invariants before considering services or new roles.

CONCRETE ROLES:
aggregate: owns mutable workflow state and enforces workflow invariants.
value-object: represents the immutable registry and each immutable workflow state definition.

RISKS FOR ABUSE: The aggregate could become a large file or construct its own
collaborators. Keep each value object in the file for its domain concept and
inject the registry through the aggregate constructor.

FIGURE: Aggregate ownership                          FIGURE: Application construction

┌─────────────────────────┐                           ┌─────────────────────────┐
│ MaintainerWorkflow      │                           │ ConfigureWorkflow       │
│ role: aggregate         │                           │ role: command-use-case  │
└─────────────────────────┘                           └─────────────────────────┘
            │                                                     │
            │ owns                                                │ parses and injects
            ▼                                                     ▼
┌─────────────────────────┐                           ┌─────────────────────────┐
│ WorkflowRegistry        │                           │ WorkflowRegistry        │
│ role: value-object      │                           │ role: value-object      │
└─────────────────────────┘                           └─────────────────────────┘
            │
            │ contains
            ▼
┌─────────────────────────┐
│ ImplementingState       │
│ role: value-object      │
└─────────────────────────┘
```

Only discuss detailed trade-offs or identify a leading option after the user
can compare the structural configurations.

### Admit options before presenting them

Explore the candidate space until further candidates only repeat an existing
structure, break an agreed constraint, or add no meaningful trade-off. Reject
invalid candidates privately. Let the number of visible options follow from
the strong, distinct candidates that remain; never target an arbitrary or
user-mentioned count. Never pad the visible options with renamed versions of
the same structure or with designs that break an agreed constraint.

Validate every candidate concept name against the represented data and
behaviour before presenting it. Treat existing code names as evidence, not as
proof of a domain concept. Inspect what the code accepts, what it returns, what
state it materialises, and which invariants it protects. Distinguish the source
evidence, the process that interprets it, and the domain result. Do not propose
a value object named after an algorithm or intermediate mechanism when the code
does not materialise that value. For example, a function called
`buildCallGraph` that returns detected architectural links does not establish a
`CallGraph` value object unless it actually produces and protects a graph of
code calls.

Apply the basic domain model tests first:

1. If a concept owns state and enforces invariants, test it as an aggregate.
2. If a concept has identity and a lifecycle inside an aggregate, test it as an
   entity.
3. If a concept is immutable and defined by its attributes, test it as a value
   object.
4. Consider a domain service only after aggregate, entity, and value object
   ownership have been ruled out.

An identifier passed separately from the objects linked to that identifier is
a basic entity signal. Before preserving a map, tuple, or parallel parameters
with that shape, test whether they are a flattened entity that should own the
identity and the relationship.

Before presenting an option, verify all of these points:

- every fixed user constraint is satisfied;
- consumers do not copy variant names, identifiers, or lookup tables owned by
  a published language into string-typed switches, maps, or default branches;
  resolve extensible strings through the published language API, and make
  closed variant handling exhaustive against the imported published language
  union with a `never` check or an exhaustive `satisfies Record<Union, ...>`;
- every proposed concept name accurately describes the data or behaviour it
  owns rather than copying a possibly misleading code identifier;
- every primitive result states what the value represents, and every operation
  name states the relationship or decision it performs;
- every declaration has a concrete role that fits its responsibility;
- every dependency and consumer relationship is legal;
- the option solves the complete error cluster rather than moving the error;
- each file stays within the 400 line limit for a real domain reason;
- aggregate ownership has not been confused with putting all code in one file;
- dependencies are supplied to the aggregate rather than constructed by it;
- fresh construction is not implemented by abusing rehydration;
- the option is structurally different from the other visible options;
- escape hatch risks and enforceable limits are explicit.

If any check fails, do not show the option. If a required fact is unknown, stop
and inspect the code or ask the user instead of filling the gap with a sketch.

### Make primitive meanings and operations explicit

Treat an unexplained primitive or broad verb as missing domain language. Ask
what a number, boolean, or string represents and what an operation such as
`compare` means before approving the API. For example, `compare(other): number`
hides both the ordering relationship and the meaning of `-1`, `0`, and `1`.
Prefer an API such as
`positionRelativeTo(other): 'before' | 'same' | 'after'`, then translate that
meaning into the numeric `Array.sort` protocol only at the technical boundary.

Apply this test to every domain model decision. A type can be technically
correct while still concealing the concept that a reader needs to understand,
use, and change the model safely.

## Apply the domain expert test

Challenge every candidate with these questions:

- Would a domain expert recognise and use these concepts and this language?
- Would they describe the process, decisions, and boundaries this way?
- Does the model separate things that the expert considers different?
- Does it group responsibilities because they belong to one domain lifecycle,
  or because one class would be easier to implement?
- Can each concept be justified without referring to a technical pattern?

When no domain expert is present, identify the assumptions that require domain
expert confirmation. Plausible code vocabulary is not confirmed domain
language.

## Stress test future evolution

Test candidates against credible changes, such as a different product, market,
interface, rule, workflow, integration, or source of information.

For each relevant change, ask what stays stable, what changes, where the change
lands, and whether the domain language and invariants remain honest. Prefer a
model when likely changes stay local and its concepts retain their meaning.
Challenge a model when change spreads across unrelated responsibilities,
weakens invariants, stretches an aggregate, or requires exceptions.

Future scenarios test a model. They do not justify speculative abstractions.
State why a scenario is credible before allowing it to influence the model.

## Treat role enforcement as a quality constraint

Rivière roles express responsibility and protect architectural quality. They
do not exist to provide somewhere convenient for code to go.

When role classification matters, read `.riviere/role-selection-guide.md` and
the complete definitions for every role under consideration. Inspect the end
to end flow before assigning a role. Responsibility determines the role; the
role does not create the responsibility.

When code does not fit, re-examine the model. Do not invent generic helpers,
managers, orchestrators, services, roles, folders, exemptions, or other escape
hatches. A new role needs a distinct, durable architectural responsibility.
Changes inside `.riviere` and new aggregate classifications require explicit
user approval.

Prefer the strongest constraints supported by current evidence when introducing
a role. Loosen them only when a concrete valid case shows that a constraint
rejects legitimate code.

## Converge gradually

When the user asks to converge, identify the model that currently appears most
suitable and explain why it leads. Base the recommendation on domain expertise,
repository evidence, credible future changes, and role constraints.

Keep the leading model open to challenge. State its important weaknesses,
assumptions, and unresolved questions. Compare it with the strongest remaining
alternative when that distinction is useful. New evidence can return the
discussion to exploration.

Only the user decides when convergence is complete. Do not infer completion
from confidence, silence, or implementation convenience. Agreement on a model
does not authorise planning or implementation.

## Record the approved model

After the user declares convergence complete, draft a concise model summary for
their approval. It should cover:

- the domain problem and story;
- concepts and responsibilities;
- identity, ownership, lifecycle, and invariants where relevant;
- boundaries and collaborations;
- supported operations;
- the credible future changes used to test the model;
- role implications;
- remaining risks and unresolved questions.

The summary is not an implementation plan. After the user approves it, store it
at
`docs/architecture/ddd/explorations/<stable-descriptive-slug>/model-summary.md`.
Use lowercase words separated by hyphens, with no date prefix. Update the same
summary when the approved model evolves.
