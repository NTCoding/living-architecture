# delivery-planning

Create and approve `delivery.md` after the PRD, architecture, and dogfooding artefact are approved.

This stage turns the approved product decision, approved architecture, and approved dogfooding deliverables into value-based delivery slices. It is the first place where milestones belong.

## Active file

Use the delivery plan file passed in the runtime context:

- `deliveryPath`

Use the approved PRD, approved architecture, and approved dogfooding artefact passed in the runtime context:

- `prdPath`
- `architecturePath`
- `dogfoodingPath`

Do not change product requirements in this stage.
Do not make new architecture decisions in this stage.
Do not create GitHub issues in this stage.

## Required starting condition

The PRD must contain:

```text
**Status:** Approved
```

The architecture document must contain:

```text
**Status:** Approved
```

If either condition is missing, the current planning command must produce:

```text
BLOCK
- PRD is not approved
- Architecture is not approved
```

Only include the blocking item that applies.

The dogfooding artefact must contain:

```text
**Status:** Approved
```

If it is missing or not approved, the current planning command must produce:

```text
BLOCK
- Dogfooding artefact is not approved
```

## Delivery planning standard

Delivery planning must describe value delivered, not internal work performed.

Milestones and deliverables must be concrete enough for GitHub issue creation. Each deliverable should have:

- user or reviewer value
- acceptance criteria
- verification notes
- dependencies or sequencing, if any
- out-of-scope notes, if any

Do not invent implementation detail beyond what exists in the approved PRD, approved architecture, and approved dogfooding artefact.

Dogfooding delivery slices must come directly from `dogfoodingPath` section `What new dogfooding to add`. Use the dogfooding deliverables, final artefact/config/script/README details, and acceptance criteria from that section. Do not create weaker or vaguer dogfooding deliverables than the dogfooding artefact provides.

If delivery planning reveals out-of-scope work that is probably or definitely needed later, apply the project-memory deferred-work triage rules before approving the delivery plan.

## Outcome-name and acceptance-criteria quality gate

Delivery milestone and deliverable names must describe the concrete outcome being delivered, not an abstract architectural intention. The title must name the actual thing that changes in concrete terms, without vague words that hide unresolved decisions.

Avoid vague outcome names such as:

- preserve the boundary
- support the model
- enable materialisation
- align with architecture
- make reusable
- prepare for workflows

unless the same title also names the concrete object, behaviour, or system state that will change.

Acceptance criteria must start with the primary outcome implied by the work name.

Examples:

- If the work is named `Retire ExtractionProject`, the first acceptance criterion must be `ExtractionProject no longer exists`.
- If the work is named `Introduce RiviereProject`, the first acceptance criterion must be `RiviereProject exists as the approved aggregate`.
- If the work is named `Migrate extract commands`, the acceptance criteria must name the old path no longer used and the approved new path used.

Each deliverable's acceptance criteria must include, where relevant:

1. **Primary outcome criteria** — the direct reviewer-visible result promised by the title.
2. **Behaviour continuity criteria** — existing user-facing or command behaviour that must still work.
3. **Approved architecture criteria** — required approved components, roles, or boundaries from `ARCH.md`.
4. **Negative criteria** — explicitly forbidden roles, shortcuts, alternative persistence concepts, or unapproved architecture shapes.

Lower-level architectural checks are allowed, but they must not replace the primary outcome criteria.

Do not invent unapproved implementation APIs, roles, loaders, materialisers, repositories, services, or persistence concepts to make a delivery slice sound complete. If the approved architecture does not define the implementation shape clearly enough for task creation, stop and ask for clarification or return to architecture rather than filling the gap.

## Acceptance criteria

Every criterion has two parts, in this order.

**Rules**

A rule states the behaviour. A rule contains no values and no file contents.

**Example**

An example is one case. Write it in Gherkin.

- `Given` states a pre-condition.
- `When` states an action.
- `Then` describes the result.

## Example

**Rule:** EventCatalog services are added as `UseCase` components in a Riviere graph.

**Example:** `OrdersService` is added as the `PlaceOrder` use case.

Given the EventCatalog source `specs/eventcatalog`

```json
{
  "domains": [],
  "services": [
    { "id": "OrdersService", "name": "Orders", "produces": ["OrderCreated"], "consumes": [] }
  ],
  "events": [{ "id": "OrderCreated", "name": "Order Created" }]
}
```

And the configuration file `specs/eventcatalog-import.yaml`

```yaml
source: ./eventcatalog
mappings: ./eventcatalog-mappings.yaml
allow-unmapped: false
```

And the configuration file `specs/eventcatalog-mappings.yaml`

```yaml
services:
  OrdersService:
    type: UseCase
    domain: orders
    module: checkout
    name: PlaceOrder
```

When running the `eventcatalog-import` stage of the workflow

Then the following item is added to the Riviere graph

```json
{
  "id": "orders:checkout:usecase:placeorder",
  "type": "UseCase",
  "name": "PlaceOrder",
  "domain": "orders",
  "module": "checkout",
  "sourceLocation": {
    "repository": "https://github.com/ntcoding/ecommerce-demo-app",
    "filePath": "specs/eventcatalog"
  }
}
```

**Rule:** EventCatalog events are added as `Event` components in a Riviere graph.

**Example:** `OrderCreated` is added as the `OrderPlaced` event.

Given the EventCatalog source `specs/eventcatalog`

```json
{
  "domains": [],
  "services": [
    { "id": "OrdersService", "name": "Orders", "produces": ["OrderCreated"], "consumes": [] }
  ],
  "events": [{ "id": "OrderCreated", "name": "Order Created" }]
}
```

And the configuration file `specs/eventcatalog-mappings.yaml`

```yaml
services:
  OrdersService:
    type: UseCase
    domain: orders
    module: checkout
    name: PlaceOrder
events:
  OrderCreated:
    name: OrderPlaced
```

When running the `eventcatalog-import` stage of the workflow

Then the following item is added to the Riviere graph

```json
{
  "id": "orders:checkout:event:orderplaced",
  "type": "Event",
  "name": "OrderPlaced",
  "eventName": "OrderPlaced",
  "domain": "orders",
  "module": "checkout",
  "sourceLocation": {
    "repository": "https://github.com/ntcoding/ecommerce-demo-app",
    "filePath": "specs/eventcatalog"
  }
}
```

**Rule:** A service that produces an event is linked to that event's component, with type `async`.

**Example:** `OrdersService` produces `OrderCreated`.

Given the EventCatalog source `specs/eventcatalog`

```json
{
  "domains": [],
  "services": [
    { "id": "OrdersService", "name": "Orders", "produces": ["OrderCreated"], "consumes": [] }
  ],
  "events": [{ "id": "OrderCreated", "name": "Order Created" }]
}
```

And the configuration file `specs/eventcatalog-mappings.yaml`

```yaml
services:
  OrdersService:
    type: UseCase
    domain: orders
    module: checkout
    name: PlaceOrder
events:
  OrderCreated:
    name: OrderPlaced
```

When running the `eventcatalog-import` stage of the workflow

Then the following item is added to the Riviere graph

```json
{
  "source": "orders:checkout:usecase:placeorder",
  "target": "orders:checkout:event:orderplaced",
  "type": "async"
}
```

**Rule:** A service that consumes an event is linked from that event's component, with type `async`.

**Example:** `ShippingService` consumes `OrderCreated`.

Given the EventCatalog source `specs/eventcatalog`

```json
{
  "domains": [],
  "services": [
    { "id": "OrdersService", "name": "Orders", "produces": ["OrderCreated"], "consumes": [] },
    { "id": "ShippingService", "name": "Shipping", "produces": [], "consumes": ["OrderCreated"] }
  ],
  "events": [{ "id": "OrderCreated", "name": "Order Created" }]
}
```

And the configuration file `specs/eventcatalog-mappings.yaml`

```yaml
services:
  OrdersService:
    type: UseCase
    domain: orders
    module: checkout
    name: PlaceOrder
  ShippingService:
    type: UseCase
    domain: shipping
    module: fulfillment
    name: ShipOrder
events:
  OrderCreated:
    name: OrderPlaced
```

When running the `eventcatalog-import` stage of the workflow

Then the following items are added to the Riviere graph

```json
{
  "id": "orders:checkout:usecase:placeorder",
  "type": "UseCase",
  "name": "PlaceOrder",
  "domain": "orders",
  "module": "checkout",
  "sourceLocation": {
    "repository": "https://github.com/ntcoding/ecommerce-demo-app",
    "filePath": "specs/eventcatalog"
  }
}
```

```json
{
  "id": "shipping:fulfillment:usecase:shiporder",
  "type": "UseCase",
  "name": "ShipOrder",
  "domain": "shipping",
  "module": "fulfillment",
  "sourceLocation": {
    "repository": "https://github.com/ntcoding/ecommerce-demo-app",
    "filePath": "specs/eventcatalog"
  }
}
```

```json
{
  "id": "orders:checkout:event:orderplaced",
  "type": "Event",
  "name": "OrderPlaced",
  "eventName": "OrderPlaced",
  "domain": "orders",
  "module": "checkout",
  "sourceLocation": {
    "repository": "https://github.com/ntcoding/ecommerce-demo-app",
    "filePath": "specs/eventcatalog"
  }
}
```

```json
{
  "source": "orders:checkout:usecase:placeorder",
  "target": "orders:checkout:event:orderplaced",
  "type": "async"
}
```

```json
{
  "source": "orders:checkout:event:orderplaced",
  "target": "shipping:fulfillment:usecase:shiporder",
  "type": "async"
}
```

**Rule:** A record with no mapping fails the stage when `allow-unmapped` is `false`.

**Example:** `OrdersService` has no mapping and `allow-unmapped` is `false`.

Given the EventCatalog source `specs/eventcatalog`

```json
{
  "domains": [],
  "services": [
    { "id": "OrdersService", "name": "Orders", "produces": [], "consumes": [] }
  ],
  "events": []
}
```

And the configuration file `specs/eventcatalog-import.yaml`

```yaml
source: ./eventcatalog
mappings: ./eventcatalog-mappings.yaml
allow-unmapped: false
```

And the configuration file `specs/eventcatalog-mappings.yaml`

```yaml
services: {}
events: {}
```

When running the `eventcatalog-import` stage of the workflow

Then the stage fails with

```text
Unmapped EventCatalog records: service 'OrdersService'
```

and `.riviere/ecommerce-architecture.json` is unchanged.

**Rule:** A record with no mapping is skipped and recorded as a diagnostic when `allow-unmapped` is `true`.

**Example:** `OrdersService` and `OrderCreated` have no mapping and `allow-unmapped` is `true`.

Given the EventCatalog source `specs/eventcatalog`

```json
{
  "domains": [],
  "services": [
    { "id": "OrdersService", "name": "Orders", "produces": [], "consumes": [] }
  ],
  "events": [{ "id": "OrderCreated", "name": "Order Created" }]
}
```

And the configuration file `specs/eventcatalog-import.yaml`

```yaml
source: ./eventcatalog
mappings: ./eventcatalog-mappings.yaml
allow-unmapped: true
```

And the configuration file `specs/eventcatalog-mappings.yaml`

```yaml
services: {}
events: {}
```

When running the `eventcatalog-import` stage of the workflow

Then the run result contains

```json
{ "kind": "unmapped-record", "recordKind": "service", "recordId": "OrdersService" }
```

and

```json
{ "kind": "unmapped-record", "recordKind": "event", "recordId": "OrderCreated" }
```

## Conversation flow

The prompts below are internal objectives, not user-facing scripts. Ask naturally. Avoid prompt IDs and stage mechanics.

### Objective 1 — Identify value milestones

Use the approved PRD, architecture, and dogfooding artefact to propose value checkpoints.

Ask the user whether the work is best sliced as:

- one serial delivery track
- a small number of value milestones
- independent streams that can be delivered in parallel
- another shape the user prefers

Milestones must be reviewable outcomes, not task buckets.

### Objective 2 — Define deliverables

For each milestone, define one or more deliverables.

Each deliverable must be something a user, reviewer, maintainer, or CI/task verifier can inspect.

Do not accept deliverables like "implement backend" or "wire up UI" unless they are reframed as user/reviewer-visible value.

### Objective 3 — Confirm dependencies and parallelisation

Explore ordering and independence:

- What must happen first?
- Which deliverables can be built independently?
- Which deliverables share product or architecture assumptions?
- Where would parallel work create coordination risk?

If splitting creates more risk than value, keep the plan serial.

### Objective 4 — Confirm verification

For each deliverable, capture how it can be verified.

Use only verification material from the approved PRD, approved architecture, approved dogfooding artefact, and user-approved additions.

If commands are named, write them exactly.

Do not invent testing strategies.

### Objective 5 — Approve delivery plan

Draft `delivery.md` and ask whether the user approves it as the source for task creation.

## Required document structure

When the user approves the delivery plan, write or update `delivery.md` with this structure:

````markdown
# Delivery Plan: <title>

**Status:** Approved

---

## 1. Delivery summary

<short summary of how the approved PRD and architecture will be sliced into delivery>

## 2. Milestones and deliverables

### M1: <value checkpoint>

#### D1.1: <deliverable title>

- Value: <value delivered>
- Acceptance criteria:
  - <observable criterion>
- Verification:
  - <how to verify, command if explicitly known>
- Dependencies:
  - <dependency or "None">
- Out of scope:
  - <excluded item or "None"; if probably or definitely needed later, link to `project-memory/ideas/<idea-slug>/`>
- Source refs:
  - PRD: <section refs>
  - Architecture: <section refs>
  - Dogfooding: <section refs, required for dogfooding deliverables>

### M2: <value checkpoint>

<same structure>

## 3. Parallelisation

```yaml
tracks:
  - name: <track name>
    deliverables:
      - <deliverable id>
    can_run_in_parallel_with:
      - <track name or none>
    coordination_risk: <risk or none>
```

## 4. Dependencies

- <dependency, blocker, or "No known dependencies.">

## 5. Task creation readiness

- Deliverables concrete enough for issue creation: Yes/No
- Acceptance criteria observable: Yes/No
- Verification notes present where known: Yes/No
- PRD and architecture source refs present: Yes/No
- Dogfooding refs present for dogfooding deliverables: Yes/No
- Open blockers: <blockers or none>
````

## Approval output

Before writing the approved file, show the user:

Before presenting the proposed delivery shape, check every milestone and deliverable:

- Does the title name the actual thing that changes in concrete terms, without vague words that hide unresolved decisions?
- Does the first acceptance criterion prove the title is true?
- Are supporting architecture constraints kept as supporting criteria rather than treated as the main outcome?
- Are negative criteria included when the architecture rejected specific alternatives?
- Are there any vague words hiding an unresolved design decision?

```text
Proposed delivery shape:
<milestones and deliverables summary>

Parallelisation:
<serial/parallel recommendation with coordination risk>

Task creation readiness:
- Deliverables concrete enough: <yes/no>
- Acceptance criteria observable: <yes/no>
- Verification notes present where known: <yes/no>
- Dogfooding refs present for dogfooding deliverables: <yes/no>
- Open blockers: <none/list>

Does this delivery plan work as the basis for creating tasks, or should we reshape the slices?
```

## Completion rule

This stage is complete only when all of these are true:

1. `delivery.md` exists
2. it contains `**Status:** Approved`
3. it contains at least one milestone
4. each milestone contains at least one deliverable
5. each deliverable has acceptance criteria and source refs
6. every dogfooding deliverable from `dogfoodingPath` section `What new dogfooding to add` is represented as a delivery deliverable with equal or greater specificity, including its final artefact/config/script/README details and acceptance criteria
7. the parallelisation section exists, even if work is serial
8. the dependencies section exists, even if there are no dependencies
9. task creation readiness says deliverables are concrete enough for issue creation
10. no `[NEEDS CLARIFICATION]` markers remain
11. delivery out-of-scope items that are probably or definitely needed later are captured in project memory

If complete, produce:

```text
ADVANCE: task-creation
```

Otherwise produce a conversational question, delivery-shape approval request, or refinement prompt and internally treat the stage as blocked.
