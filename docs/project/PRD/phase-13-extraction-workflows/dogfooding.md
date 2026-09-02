# Dogfooding: Phase 13 Extraction Workflows

**Status:** Approved

---

## 1. New functionality added in this PRD to verify

1. File-addressed `riviere workflow validate`, `riviere workflow run`, and greenfield-only `riviere workflow init` user journeys. Source: `PRD.md` §§2-4.
2. One ordered run containing code extraction, EventCatalog import, AsyncAPI import, additive AI extraction, additive AI enrichment, and non-mutating schema validation. Source: `PRD.md` §4.
3. Strict file-relative workflow and stage configuration, mapping validation, and active AI prerequisite checks. Source: `PRD.md` §4.
4. Structured stage events, diagnostics, summaries, complete transition snapshots, rollback, and atomic final output. Source: `PRD.md` §§4 and 6.
5. Byte-identical deterministic execution when AI stages are skipped. Source: `PRD.md` §6.
6. Preservation of direct deterministic extraction behaviour. Source: `PRD.md` §§3 and 6.

## 2. What dogfooding exists today

The customer-like source is the separate `NTCoding/ecommerce-demo-app` repository. At the audited revision it contains five domain applications plus `bff/` and `ui/`, a top-level `.riviere/config/extraction.config.json`, per-component extraction configs, expected deterministic component/connection fixtures, and `scripts/verify-extraction.mjs` plus `scripts/verify-connections.mjs`. Its README documents the direct extraction journey.

Phase 13 preserves all of that. The existing source, extraction configs, `expected-extraction-output.json`, `expected-connections.json`, `extraction-output.json`, scripts, and pre-Phase-13 README guidance remain authoritative and unchanged. Workflow dogfooding is additive.

## 3. What new dogfooding to add

### 3.1 D0.2: External specification sources and mappings

**Customer action:** maintain EventCatalog and AsyncAPI sources describing the demo's existing orders, shipping, inventory, payment, and notifications flows.

**Customer-visible result:** `workflow validate` accepts the files, and deterministic importer stages normalize records onto the same canonical component identities already extracted from code.

**Locations in `ecommerce-demo-app`:**

```text
specs/eventcatalog/
specs/eventcatalog-import.yaml
specs/eventcatalog-mappings.yaml
specs/asyncapi.yaml
specs/asyncapi-import.yaml
specs/asyncapi-mappings.yaml
```

Final importer configs:

```yaml
# specs/eventcatalog-import.yaml
source: ./eventcatalog
mappings: ./eventcatalog-mappings.yaml
allow-unmapped: false
```

```yaml
# specs/eventcatalog-mappings.yaml
domains:
  OrdersDomain: orders
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

The EventCatalog source must include at least the orders service producing the canonical OrderPlaced event and downstream shipping, inventory, payment, and notifications consumers. The SDK capability test must prove domains, services, events, producers, and consumers can be read from this exact fixture. If the SDK cannot expose those relationships, the deliverable stops; no fallback parser is added.

```yaml
# specs/asyncapi-import.yaml
source: ./asyncapi.yaml
mappings: ./asyncapi-mappings.yaml
allow-unmapped: false
```

```yaml
# specs/asyncapi-mappings.yaml
messages:
  OrderPlacedMessage:
    domain: orders
    module: checkout
    name: OrderPlaced
operations:
  processOrder:
    type: UseCase
    domain: orders
    module: checkout
    name: ProcessOrder
```

The AsyncAPI document is version 3 and contains publish/subscribe operations for the same cross-domain event flow. It includes `OrderPlacedMessage` and `processOrder`, contains no request/reply operation, and validates with `@asyncapi/parser`. Servers/channels may support resolution but never become graph components.

Acceptance criteria:

- All six files exist and pass the published Phase 13 schemas or selected SDK/parser.
- Every mapped domain, service, message, event, and operation resolves to a canonical identity present in the expected workflow graph.
- Existing deterministic verification scripts and fixtures have no diff.
- The demo README explains that the specs are authoritative for the scalar fields they contribute.

### 3.2 D0.3: Executable Workflow, AI configs, and generated fixtures

**Customer action:** validate and run one root Workflow against the unchanged demo source and extraction config.

**Customer-visible result:** the command produces one graph and log, and every accumulated stage transition can be compared to an approved fixture.

Final root file:

```yaml
# riviere-workflow.yaml
apiVersion: v1
name: ecommerce-architecture
description: Full architecture graph for the ecommerce demo app
output: ./.riviere/ecommerce-architecture.json
sources:
  - repository: ecommerce-demo-app
domains:
  orders:
    description: Order lifecycle and checkout
    systemType: domain
  shipping:
    description: Shipment orchestration
    systemType: domain
  inventory:
    description: Stock reservation and replenishment
    systemType: domain
  payment:
    description: Payment authorisation and settlement
    systemType: domain
  notifications:
    description: Customer notification fan-out
    systemType: domain
  bff:
    description: Backend-for-frontend aggregating domain APIs
    systemType: bff
  ui:
    description: Customer-facing web UI
    systemType: ui
stages:
  - name: extract-code
    kind: code-extraction
    config: ./.riviere/config/extraction.config.json
  - name: import-eventcatalog
    kind: eventcatalog-import
    config: ./specs/eventcatalog-import.yaml
  - name: import-asyncapi
    kind: asyncapi-import
    config: ./specs/asyncapi-import.yaml
  - name: discover-gaps
    kind: ai-extract
    config: ./stages/ai-extract.yaml
  - name: enrich-metadata
    kind: ai-enrich
    config: ./stages/ai-enrich.yaml
  - name: validate
    kind: schema-validate
```

Final AI extraction config:

```yaml
# stages/ai-extract.yaml
command: claude
args: ['-p']
timeout-seconds: 600
memory: ./ai-memory.md
prompt-append: ./ai-extract.instructions.md
sources:
  - ../orders-domain/src
  - ../shipping-domain/src
  - ../inventory-domain/src
  - ../payment-domain/src
  - ../notifications-domain/src
  - ../bff/src
  - ../ui/src
selection:
  from:
    - uncertain-links
    - missing-events
    - missing-event-handlers
    - missing-use-cases
  component-types: [Event, EventHandler, UseCase, DomainOp]
outputs:
  add-components: true
  add-links: true
context:
  exclude:
    - '**/*.spec.ts'
    - '**/dist/**'
  max-files-per-batch: 20
  max-batches: 5
```

Final AI enrichment config:

```yaml
# stages/ai-enrich.yaml
command: claude
args: ['-p']
timeout-seconds: 600
memory: ./ai-memory.md
prompt-append: ./ai-enrich.instructions.md
sources:
  - ../orders-domain/src
  - ../shipping-domain/src
  - ../inventory-domain/src
  - ../payment-domain/src
  - ../notifications-domain/src
  - ../bff/src
  - ../ui/src
selection:
  component-types: [Event, EventHandler, API, DomainOp, UI, UseCase]
  missing-fields-only: true
fields:
  - eventName
  - subscribedEvents
  - operationName
  - route
  - httpMethod
  - path
context:
  exclude:
    - '**/*.spec.ts'
    - '**/dist/**'
  max-files-per-component: 10
```

Required generated files:

```text
tests/workflow-ground-truth.json
tests/workflow-transitions/00-initial.json
tests/workflow-transitions/01-after-extract-code.json
tests/workflow-transitions/02-after-import-eventcatalog.json
tests/workflow-transitions/03-after-import-asyncapi.json
tests/workflow-transitions/04-after-discover-gaps.json
tests/workflow-transitions/05-after-enrich-metadata.json
tests/workflow-transitions/06-after-validate.json
```

The fixture generator runs the known-good Workflow and serializes `WorkflowRunResult.transitions` in canonical order. It does not import private domain files, inspect private Builder state, or install an observer. A maintainer confirms the known-good full result before committing generated JSON. `06-after-validate.json` must be byte-identical to `05-after-enrich-metadata.json` after canonical serialization.

The ground-truth assertion compares exact component IDs, full internal Link occurrence identities including source location, full external-Link identities, selected spec-owned scalar overwrites, additive-only AI fields, and required Workflow log events. The README enumerates every deliberate extraction gap and its expected AI addition or enrichment.

Acceptance criteria:

- `riviere workflow validate ./riviere-workflow.yaml` succeeds.
- A normal known-good run writes `.riviere/ecommerce-architecture.json` and `.riviere/workflow.log.ndjson`.
- Fixture regeneration from returned transitions is byte-stable for the same approved run inputs.
- `schema-validate` changes no component, Link, external Link, or diagnostic.
- Existing direct extraction scripts and fixtures remain unchanged and continue to pass.
- README retains the existing guide and adds a complete Phase 13 Workflow section with validate, run, `--skip-ai`, `--dry-run`, output, log, fixture, and migration explanations.

### 3.3 D0.4: Pinned cross-repository contract

**Customer action:** contributors update the demo and product repositories as a coordinated pair when schemas or behaviour change.

**Customer-visible result:** product CI always tests an immutable customer fixture and fails until a compatible demo revision is pinned.

Final contract:

```text
1. Merge the compatible ecommerce-demo-app change, including regenerated Workflow fixtures.
2. Record that immutable commit SHA in living-architecture's Phase 13 integration configuration.
3. Clone NTCoding/ecommerce-demo-app at exactly that SHA in CI.
4. Run existing deterministic demo verification unchanged.
5. Run Workflow validation, exact ground-truth checks, transition checks, and two --skip-ai runs.
6. Change the pin only through a coordinated pull request that explains any fixture regeneration.
```

The currently audited demo revision is evidence of the pre-Phase-13 baseline only; it is not the final pin. The final pin is selected only after D0.2 and D0.3 pass.

Acceptance criteria:

- No demo source, specs, configs, or generated fixtures are copied into `living-architecture`.
- CI clones the exact approved SHA and refuses a floating branch.
- The coordination documentation identifies both repositories and the required fixture-regeneration order.
- The demo README and product integration docs point to the same Workflow path and commands.

### 3.4 D5.1: Exact end-to-end customer gate

Run the pinned root Workflow and compare the final graph and NDJSON events with demo-owned ground truth. The gate proves exact component IDs, complete Link occurrence identities, selected authoritative spec overwrites, additive-only AI behaviour in the approved known-good run, unresolved-diagnostic refusal, and atomic final output.

```text
riviere workflow validate ./riviere-workflow.yaml
riviere workflow run ./riviere-workflow.yaml
```

### 3.5 D5.2: Transition and deterministic idempotency gate

Compare the public result's seven transition snapshots with the seven demo fixtures. Then execute the unchanged Workflow twice with AI disabled and compare canonical graph bytes.

```text
riviere workflow run ./riviere-workflow.yaml --skip-ai
riviere workflow run ./riviere-workflow.yaml --skip-ai
```

The gate makes no claim about AI-inclusive idempotency.

### 3.6 D6.1: Show new users TypeScript, EventCatalog, AsyncAPI, additive AI stages, and validation in ecommerce-demo-app

**Problem:** people who have not seen or used Riviere need to learn what it does with their code and other architecture information, understand how it applies to their application, and get a first working setup before they can adopt it.

**Customer action:** in `ecommerce-demo-app`, run `riviere workflow validate ./riviere-workflow.yaml` and `riviere workflow run ./riviere-workflow.yaml` against the pinned demo revision. `riviere-workflow.yaml` combines TypeScript code extraction, EventCatalog import, AsyncAPI import, additive AI extraction, additive AI enrichment, and schema validation. Compare the graph and NDJSON output using §3.4, and compare the seven public transitions with `tests/workflow-transitions/00-initial.json` through `tests/workflow-transitions/06-after-validate.json`. Then run `riviere workflow run ./riviere-workflow.yaml --skip-ai` twice and compare the canonical graph bytes as described in §3.5.

**Customer-visible result:** users can see TypeScript code extraction, EventCatalog import, AsyncAPI import, additive AI extraction, additive AI enrichment, and schema validation produce `.riviere/ecommerce-architecture.json` and `.riviere/workflow.log.ndjson` for a realistic multi-domain system. The graph and NDJSON comparison defined in §3.4, the seven public stage transition fixtures at `tests/workflow-transitions/00-initial.json` through `tests/workflow-transitions/06-after-validate.json`, and the two AI-skipped output comparison defined in §3.5 all pass.

Acceptance criteria:

- `riviere workflow validate ./riviere-workflow.yaml` and `riviere workflow run ./riviere-workflow.yaml` succeed against the pinned demo revision and exercise TypeScript code extraction, EventCatalog import, AsyncAPI import, additive AI extraction, additive AI enrichment, and schema validation.
- The exact graph and NDJSON comparison in §3.4 plus the public-stage-transition and two-AI-skipped-run comparisons in §3.5 remain passing.
- Any discrepancy in source composition, `.riviere/ecommerce-architecture.json`, `.riviere/workflow.log.ndjson`, `tests/workflow-transitions/00-initial.json` through `tests/workflow-transitions/06-after-validate.json`, or the two AI-skipped outputs becomes a focused bugfix ticket; the Phase 13 PRD workstream remains open until those tickets are complete and every command and comparison listed above passes again.
- When the verification passes with no unresolved discrepancy, Phase 13 is ready to close and the next project may begin.

## 4. Blockers

No planning blockers. Executable Workflow fixtures and the final immutable demo SHA cannot be produced until the corresponding product capabilities exist; the delivery plan models that dependency explicitly.
