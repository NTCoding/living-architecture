---
status: approved
dateAdded: 2026-08-24
systemAreas:
  - global
  - dev-workflow-v2
architectureConcepts:
  - boundary-placement
  - component-responsibility
  - project-conventions
  - riviere-role-understanding
  - trade-off-reasoning
source: conversation: deriving MaintainerWorkflow from registry role failures
---

# Derive aggregates before inventing coordination roles

## Memory

### Start from the error cluster and show the actual dependency

The workflow registry cluster initially appeared as several domain services
calling other domain services. The important code was simpler than the role
annotations suggested:

```ts
const WORKFLOW_REGISTRY = {
  IMPLEMENTING: defineImplementingState(),
  REVIEWING: defineReviewingState(),
  // other states
}

export function getWorkflowRegistry() {
  return WORKFLOW_REGISTRY
}
```

`getWorkflowRegistry` made no domain decision. It was an accessor over a module
constant, so its `domain-service` annotation concealed the real concepts.

Passing this function to another component was still using it. The use case
depended on the function when it supplied `getRegistry: getWorkflowRegistry` to
the workflow engine. Whether the use case invoked the function immediately did
not change the dependency.

### Apply the basic aggregate test first

The discussion generated many complicated coordination options before asking
the basic question: does the workflow own state and enforce invariants?

The implemented `Workflow` already held mutable workflow state, pending events,
event application, transition behaviour, operation gates, and workflow
invariants. Those are direct aggregate signals. Testing the concept as an
aggregate should have happened before considering coordinator roles, facades,
or application assembly alternatives.

The approved concept is `MaintainerWorkflow`:

- it is the aggregate;
- it owns `WorkflowState`;
- it owns the workflow registry;
- it applies workflow events and protects workflow invariants.

### Names do not decide the role

A noun is not automatically an entity or value object, and a verb is not
automatically a service. Naming can reveal a mismatch, but identity, lifecycle,
state, invariants, and responsibility decide the concept.

The registry has no independent identity, lifecycle, or mutation. It is an
immutable value object. Each workflow state definition is also an immutable
value object with data and behaviour expressed through methods.

### Ownership does not mean one file

Aggregate ownership must not be confused with putting every owned concept in
the aggregate file.

The 400 line rule is a modelling signal. The accepted structure keeps separate
files for:

- `MaintainerWorkflow`;
- `MaintainerWorkflowRegistry`;
- `WorkflowState` and its event application behaviour;
- each concrete workflow state definition.

The aggregate owns these concepts through composition. Their separate files
preserve the real domain concepts and do not weaken aggregate ownership.

### Apply dependency inversion at construction

This construction was rejected:

```ts
private static readonly REGISTRY = MaintainerWorkflowRegistry.create()
```

It made the aggregate construct its dependency. The registry must be parsed or
assembled outside the aggregate and supplied through the aggregate constructor:

```ts
MaintainerWorkflow.build(
  MaintainerWorkflowRegistry.parse({
    IMPLEMENTING: ImplementingState.parse('IMPLEMENTING'),
    // other states
  }),
  dependencies,
  state,
)
```

Fresh construction and reconstruction from existing state are different
operations. Do not call a method named `rehydrate` to create the initial
aggregate. Use the proper `build` constructor and supply the initial state
explicitly when the integration contract requires a state value.

### Reject invalid options before presenting them

Several visible options were not genuine options. They renamed domain service
chains, laundered forbidden dependencies through a use case, introduced vague
concepts, duplicated another option, or broke the 400 line rule.

Generate extra candidates privately, but only present a candidate after it has
passed these checks:

- it uses concrete domain concepts and existing roles where they fit;
- all dependency relationships are legal;
- it solves the full error cluster;
- it preserves fixed consumer requirements;
- every file remains within the 400 line constraint for a domain reason;
- it does not construct dependencies inside the aggregate;
- it distinguishes initial construction from rehydration;
- it is structurally different from the other options;
- it does not create an escape hatch.

## Why this matters

The simple model was available from the start. The delay came from skipping the
basic state, invariant, identity, and ownership tests and moving too quickly to
coordination structures and new roles.

Applying the basic tests first makes option generation faster and more reliable.
It also prevents role enforcement work from turning into annotation changes
that preserve a weak domain model.

## Consider this when

- a stateful class is annotated as a domain service;
- one registry or coordinator causes many domain service dependency errors;
- a proposed aggregate appears to require a very large file;
- a use case is used to hide a dependency that would otherwise be forbidden;
- an aggregate constructs the collaborators that define its behaviour;
- initial creation and rehydration are being treated as the same operation.

## Do not apply automatically when

- the component has no owned state or invariants;
- the registry has an independent identity and lifecycle supported by domain
  evidence;
- the separate declarations are arbitrary fragments rather than real domain
  concepts;
- a tactical bridge has been explicitly accepted with known architecture debt.

## Clarify with the user when

- identity or lifecycle evidence is missing;
- the aggregate boundary would move invariant enforcement across a package or
  external engine boundary;
- a registry consumer needs more than the aggregate public API;
- dependency inversion would require a material change to the application
  composition contract.

## Related references

- `.agents/skills/ddd/SKILL.md`
- `.riviere/role-definitions/aggregate.md`
- `.riviere/role-definitions/value-object.md`
- `.riviere/role-definitions/domain-service.md`
- `project-memory/architecture/memories/domain-facade-from-riviere-query-role-failures.md`
