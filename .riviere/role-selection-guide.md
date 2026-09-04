# Role Selection Guide

**Aggregate classification requires explicit user approval.** Every aggregate must be listed in `approvedInstances` in `.riviere/roles.ts` with `userHasApproved: true`. AI assistants must confirm with the user before adding any new entry. If uncertain whether something is an aggregate or a query-model, ask — do not default to aggregate.

Use this guide for an initial classification before consulting the role definition files.

If code does not fit cleanly, do not force it into the closest-looking role. First check whether it is a fragment of a missing concept, especially a missing `aggregate-repository`.

Before selecting `domain-service`, test whether the behaviour belongs on an aggregate, then a value object. It is valid only when neither is the natural owner. State remains private to its aggregate; a use case must not read it to decide a domain rule.

Select `domain-facade` only when command use cases or query consumers need one stable interface over several related domain capabilities. It is a consumer interface, not an internal dependency of the domain model.

The key question to ask:

- At what point in the end-to-end flow is this code used?

Then ask:

- What is the result of this code used for immediately afterward?
- Is this code actually interacting with an external system, or only helping another component decide how to do so?

## 1. Handling the raw inputs

Does this code handle raw data when it enters the application?

If yes, it is:

- `cli-entrypoint`, or
- a component used by the `cli-entrypoint` to process the raw inputs, such as:
  - `entrypoint-cli-input-parser`
  - `command-input-factory`

## 2. Loading previously stored state

Is this code used to help rebuild previously saved application state?

If yes, it is part of loading an aggregate. Therefore it is:

- `aggregate-repository`, or
- a component used by the `aggregate-repository`, such as `external-client-service`

This remains true when an aggregate needs the data only for one later
operation. Previously created state from the same aggregate lifecycle must be
restored by the repository as part of the aggregate. Do not pass a loader into
an aggregate operation and use a `domain-port` to recover that state after the
repository has returned the aggregate.

Heuristics:

- If the result is used immediately to locate, read, or rebuild persisted application state, classify it on the aggregate-repository side of the flow
- Do not classify code as `external-client-service` unless it actually interacts with the external system
- A helper that only decides how to locate persisted state is not automatically an `external-client-service`
- If code clearly belongs to the state loading phase but does not fit any existing repository abstraction, treat that as a signal that the aggregate-repository concept is missing or incomplete
- If the logic is specific to this application rather than a specialised wrapper around generic external behavior, prefer treating it as part of the missing aggregate-repository concept rather than forcing it into `external-client-service`

Example:

- a driver for interacting with MySQL databases

Repository extraction process:

- If the code appears to belong to state loading or persistence but no repository owns it yet, assume a repository concept may be missing
- Identify the aggregate explicitly by identifying the state it owns, the behavior it exposes, and the persisted state from which it is rehydrated
- If the aggregate does not already exist as a single explicit type, extract it from the currently scattered state and behavior
- Start by defining the repository interface
- The interface should expose repository operations in terms of aggregate identity and aggregate values, for example `loadById(id): Aggregate`
- Then identify the steps between the repository input and the fully loaded aggregate
- If two pieces of logic must always be used together at every call site, they likely belong to the same concept and should usually be combined behind one boundary
- The point where the aggregate is fully constructed marks the core load boundary of the repository
- Do the same for persistence: identify the steps between the aggregate and the final stored representation
- The aggregate is not the persisted state itself; the persisted state is what the repository uses to rehydrate the aggregate
- Only the `command-use-case` should depend on an `aggregate-repository`; `cli-entrypoint` should not import it directly

## 3. Persisting updated state

Is this code used to help persist the result after a `command-use-case` has orchestrated the domain and got a result?

If yes, it is:

- `aggregate-repository`, or
- a component used by the `aggregate-repository` to persist the state

Heuristics:

- If the result is used immediately to choose where or how state will be written, classify it on the aggregate-repository side of the flow
- Distinguish code that decides persistence parameters from code that actually performs the write
- If code clearly belongs to the persistence phase but no repository abstraction owns it yet, treat that as a signal that the aggregate-repository concept is missing or incomplete

## 4. Querying previously stored state (read-only)

Is this code used to read and return previously stored state WITHOUT modifying anything?

If yes, it is part of the query side. Ask: does it orchestrate the query, or does it hold the queryable state?

- If it orchestrates (loads a query model, calls query methods, returns a result): `query-model-use-case`
- If it is the query model itself (holds immutable state, exposes read-only methods): `query-model`
- If it defines result types returned by the query model: `query-model`
- If it loads the concrete result for an actual query use case from storage: `query-model-loader`
- If it defines the input contract for a query use case: `query-model-use-case-input`
- If loading the query model fails: `data-access-error`

**Critical distinction from commands:** If the code loads state but NEVER modifies or saves it, it belongs on the query side. The presence of a repository-like loading pattern does not automatically make something a `command-use-case` + `aggregate-repository`.

**Critical distinction from aggregates:** A class that holds state and exposes methods is NOT automatically an aggregate. If none of its methods modify state, it is a `query-model`. Aggregates must enforce behavioral invariants through state-modifying operations.

## 5. Invoking an external capability from the domain

Keep the three responsibilities separate:

- A generic client under the use-case package's `infra/external-clients/{client}/` knows only the external system's API and types.
- A `domain-port` in the subdomain's domain-model package defines the capability the domain needs in domain language.
- A `domain-port-adapter` under the use-case feature's `adapters/{client}/` implements one domain port using one generic client API.

The adapter translates between the two contracts. It does not contain domain decisions, application orchestration, direct Node API calls, or third-party package calls. It must not coordinate multiple clients. The Node and third-party restriction is specific to this architecture's deliberate split between a domain-port adapter and a generic external client; it is not a claim that all adapters everywhere must avoid technology imports. See [`domain-port-adapter`](role-definitions/domain-port-adapter.md) for the concrete Oxlint and GitHub examples and the failure caused by combining the two roles.

The use case or domain receives the port. The shell constructs the generic client and adapter, then supplies the adapter at the application boundary.

A port may provide a current external fact or perform an external action needed
during domain behaviour. It must not recover previously created state owned by
the aggregate. That is aggregate restoration and belongs to the repository,
even when the stored state is in a separate file or is needed by only one
aggregate operation.

Repositories and query-model loaders belong in `data-access/`, not `adapters/`. Their responsibility is reconstructing or persisting application state, not implementing an external capability used during domain execution.

## 6. Processing the result

Is this code used to process the result after a `command-use-case` has completed?

If yes, keep presentation decisions separate from output side effects:

- `cli-entrypoint` orchestrates the result path.
- `cli-output-formatter` decides how one command or query result is presented.
- `cli-response-formatter` may wrap that content in a reusable response envelope.
- `cli-output` is fully formatted data ready to emit. Its shape belongs to the application, not the role.
- `cli-response-writer` emits `cli-output` consistently and makes no command-specific presentation decisions.

New and changed code must not pass command results, query models, primitives, `unknown`, or unclassified data directly to a response writer. Existing cases are tracked for migration in GitHub issue #523.
