# Role Selection Guide

**Aggregate classification requires explicit user approval.** Every aggregate must be listed in `approvedInstances` in `.riviere/roles.ts` with `userHasApproved: true`. AI assistants must confirm with the user before adding any new entry. If uncertain whether something is an aggregate or a query-model, ask — do not default to aggregate.

Use this guide for an initial classification before consulting the role definition files.

If code does not fit cleanly, do not force it into the closest-looking role. First check whether it is a fragment of a missing concept, especially a missing `aggregate-repository`.

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
  - `cli-input-validator`
  - `command-input-factory`

## 2. Loading previously stored state

Is this code used to help rebuild previously saved application state?

If yes, it is part of loading an aggregate. Therefore it is:

- `aggregate-repository`, or
- a component used by the `aggregate-repository`, such as `external-client-service`

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
- If it loads the query model from storage: `query-model-loader`
- If it defines the input contract for a query use case: `query-model-use-case-input`
- If it is an error thrown during query operations: `query-model-error`

**Critical distinction from commands:** If the code loads state but NEVER modifies or saves it, it belongs on the query side. The presence of a repository-like loading pattern does not automatically make something a `command-use-case` + `aggregate-repository`.

**Critical distinction from aggregates:** A class that holds state and exposes methods is NOT automatically an aggregate. If none of its methods modify state, it is a `query-model`. Aggregates must enforce behavioral invariants through state-modifying operations.

## 5. Processing the result

Is this code used to process the result after a `command-use-case` has completed?

If yes, then it is:

- `cli-entrypoint`, or
- a helper used by the `cli-entrypoint`, such as `cli-output-formatter`
