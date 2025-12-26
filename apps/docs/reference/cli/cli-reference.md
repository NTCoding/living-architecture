---
pageClass: reference
---

# Command Reference

Complete documentation for all Riviere CLI commands.

**Schema version:** `v1.0`

## Installation

```bash
npm install @living-architecture/riviere-cli
```

> **Note:** Package not yet published to npm. For now, clone the repository and reference the local package.

## Usage

```bash
riviere builder <command> [options]
```

## Command syntax

All graph-building commands are subcommands of `riviere builder`.

## Graph selection

By default, commands read and write the current graph in `.riviere/`.

The CLI selects the current graph by finding the first `.json` file in `.riviere/` that does not include `checklist`, `summary`, or `config` in its filename.

If you want to validate a specific file without selecting a current graph, use `validate --file`:

```bash
riviere builder validate --file ./my-graph.json
```

## Exit codes

- `0`: Success (including warnings)
- `1`: Error or failed validation/consistency

## Complete workflow

```bash
riviere builder new-graph --name "my-service"
riviere builder add-source --repository "my-repo" --commit "abc123"
riviere builder add-domain --name "orders" --type "domain" --description "Order management"

riviere builder add-component --type API --domain orders --module api \
  --http-method POST --path /orders \
  --repository my-repo --source-file src/api/orders.ts --source-line 42

riviere builder add-component --type UseCase --domain orders --module checkout \
  --name "place-order" \
  --repository my-repo --source-file src/usecases/place-order.ts --source-line 10

riviere builder link \
  --from "orders:api:api:post/orders" \
  --to-type UseCase --to-domain orders --to-name "place-order" \
  --type sync

riviere builder check-consistency
riviere builder validate
```

---

## Graph Initialization

### `new-graph`

Initialize a new Riviere graph.

```bash
riviere builder new-graph --name <name> [--description <description>]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--name <name>` | Graph name (used for file name) |

**Optional:**
| Flag | Description |
|------|-------------|
| `--description <description>` | Graph description |

**Output:** Creates `.riviere/{name}.json`

**Examples:**
```bash
riviere builder new-graph --name "ecommerce-a1b2c3"
riviere builder new-graph --name "my-project" --description "Architecture graph"
```

---

### `add-source`

Register a source repository.

```bash
riviere builder add-source --repository <repository> --commit <commit>
```

**Required:**
| Flag | Description |
|------|-------------|
| `--repository <repository>` | Repository name or URL |
| `--commit <commit>` | Commit hash |

**Examples:**
```bash
riviere builder add-source --repository "ecommerce" --commit "a1b2c3"
riviere builder add-source --repository "https://github.com/org/repo" --commit "abc123"
```

---

### `add-domain`

Add a domain to the graph.

```bash
riviere builder add-domain --name <name> --type <type> --description <description>
```

**Required:**
| Flag | Description |
|------|-------------|
| `--name <name>` | Domain name |
| `--type <type>` | Domain type: `domain` \| `bff` \| `ui` \| `other` |
| `--description <description>` | Domain description |

**Examples:**
```bash
riviere builder add-domain --name "orders" --type "domain" --description "Order management"
riviere builder add-domain --name "checkout-bff" --type "bff" --description "Checkout backend-for-frontend"
```

---

## Component Management

### `add-component`

Add a component to the graph. Supports all 7 component types with type-specific flags.

```bash
riviere builder add-component --type <type> --domain <domain> --module <module> \
  --repository <repository> --source-file <file> --source-line <line> \
  [type-specific options]
```

**Required (all types):**
| Flag | Description |
|------|-------------|
| `--type <type>` | Component type: `UI` \| `API` \| `UseCase` \| `DomainOp` \| `Event` \| `EventHandler` \| `Custom` |
| `--domain <domain>` | Domain name |
| `--module <module>` | Module name |
| `--repository <repository>` | Source repository |
| `--source-file <file>` | Source file path |
| `--source-line <line>` | Source line number |

**Optional (all types):**
| Flag | Description |
|------|-------------|
| `--description <description>` | Component description |

#### Type-Specific Flags

**UI:**
| Flag | Required | Description |
|------|----------|-------------|
| `--name <name>` | Yes | Component name |
| `--route <route>` | Yes | UI route path |

**API (REST):**
| Flag | Required | Description |
|------|----------|-------------|
| `--http-method <method>` | Yes | `GET` \| `POST` \| `PUT` \| `PATCH` \| `DELETE` \| `HEAD` \| `OPTIONS` |
| `--path <path>` | Yes | API endpoint path |

**API (GraphQL):**
| Flag | Required | Description |
|------|----------|-------------|
| `--operation-name <name>` | Yes | GraphQL operation name |

**UseCase:**
| Flag | Required | Description |
|------|----------|-------------|
| `--name <name>` | Yes | UseCase name |

**DomainOp:**
| Flag | Required | Description |
|------|----------|-------------|
| `--operation-name <name>` | Yes | Operation/method name |
| `--entity <entity>` | No | Entity this operation belongs to |

**Event:**
| Flag | Required | Description |
|------|----------|-------------|
| `--event-name <name>` | Yes | Event name |

**EventHandler:**
| Flag | Required | Description |
|------|----------|-------------|
| `--name <name>` | Yes | Handler name |
| `--subscribed-events <events>` | Yes | Comma-separated event names |

**Custom:**
| Flag | Required | Description |
|------|----------|-------------|
| `--name <name>` | Yes | Component name |
| `--custom-type <type>` | Yes | Custom type name |

**Examples:**
```bash
riviere builder add-component --type API --domain orders --module api \
  --http-method POST --path /orders \
  --repository ecommerce --source-file src/api/orders.ts --source-line 10

riviere builder add-component --type DomainOp --domain orders --module checkout \
  --entity Order --operation-name begin \
  --repository ecommerce --source-file src/domain/Order.ts --source-line 42

riviere builder add-component --type UseCase --domain orders --module checkout \
  --name "place-order" \
  --repository ecommerce --source-file src/usecases/PlaceOrder.ts --source-line 5

riviere builder add-component --type Event --domain orders --module checkout \
  --event-name "order-placed" \
  --repository ecommerce --source-file src/events/OrderPlaced.ts --source-line 1

riviere builder add-component --type EventHandler --domain shipping --module handlers \
  --name "handle-order-placed" --subscribed-events "order-placed" \
  --repository ecommerce --source-file src/handlers/OrderPlacedHandler.ts --source-line 5
```

**Output:** `Added {type}: {componentId}`

---

## Linking

### `link`

Create a link between two components.

```bash
riviere builder link --from <id> --to-type <type> --to-domain <domain> \
  (--to-name <name> | --to-event-name <name>) --type <sync|async>
```

**Required:**
| Flag | Description |
|------|-------------|
| `--from <id>` | Source component ID (exact ID from checklist) |
| `--to-type <type>` | Target component type |
| `--to-domain <domain>` | Target component domain |
| `--type <type>` | Link type: `sync` \| `async` |

**Conditional (one required):**
| Flag | When to use |
|------|-------------|
| `--to-name <name>` | For all types except Event |
| `--to-event-name <name>` | For Event type only |

**Important:** The `--from` parameter uses the exact component ID. The `--to-*` parameters are lookup criteria.

**Examples:**
```bash
riviere builder link \
  --from "orders:api:api:postorders" \
  --to-type UseCase --to-domain orders --to-name "place-order" \
  --type sync

riviere builder link \
  --from "orders:checkout:domainop:orderbegin" \
  --to-type Event --to-domain orders --to-event-name "order-placed" \
  --type async
```

**Output:** `Linked: {sourceId} → {targetId} ({type})`

---

### `link-http`

Create a link to an API endpoint by HTTP method and path. Supports path normalization.

```bash
riviere builder link-http --from <id> --method <method> --path <path> \
  [--domain <domain>] [--system <name>] [--url <url>]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--from <id>` | Source component ID |
| `--method <method>` | HTTP method: `GET` \| `POST` \| `PUT` \| `PATCH` \| `DELETE` |
| `--path <path>` | API endpoint path |

**Optional:**
| Flag | Description |
|------|-------------|
| `--domain <domain>` | Target must be in this domain; error if not found |
| `--system <name>` | External system name (for external links) |
| `--url <url>` | External system URL |

**Path Matching:** Paths are normalized to handle parameter variations:
- `{paramName}`, `:paramName`, and numeric values all match each other
- `/companies/{id}/employees` matches `/companies/123/employees`

**Lookup Behavior:**
1. Search API components by method + normalized path
2. If `--domain` provided: search only that domain, error if no match
3. If match found: create internal sync link
4. If no match (and no `--domain`): create external link using `--system`/`--url`

**Examples:**
```bash
riviere builder link-http \
  --from "bff:collaborator:usecase:hire" \
  --method POST --path "/companies/{id}/employees" \
  --domain "employee-management"

riviere builder link-http \
  --from "orders:checkout:usecase:pay" \
  --method POST --path "/v1/charges" \
  --system "Stripe" --url "https://api.stripe.com"
```

---

### `link-external`

Create a link from a component to an external system.

```bash
riviere builder link-external --from <id> --name <name> --type <type> \
  [--domain <domain>] [--repository <repository>] [--url <url>] [--description <description>]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--from <id>` | Source component ID |
| `--name <name>` | External system name (e.g., "Stripe", "FedEx API") |
| `--type <type>` | Link type: `sync` \| `async` |

**Optional:**
| Flag | Description |
|------|-------------|
| `--domain <domain>` | External system domain if known |
| `--repository <repository>` | External system repository if known |
| `--url <url>` | External system URL |
| `--description <description>` | Description of this integration |

**Examples:**
```bash
riviere builder link-external \
  --from "payment:gateway:usecase:process-payment" \
  --name "Stripe" \
  --type sync \
  --url "https://api.stripe.com" \
  --description "Process payment via Stripe"

riviere builder link-external \
  --from "shipping:tracking:usecase:update-tracking" \
  --name "FedEx API" \
  --type sync \
  --domain "shipping" \
  --repository "fedex-sdk"
```

**Output:** `Linked: {sourceId} → external:{name} ({type})`

---

## Enrichment

### `enrich`

Enrich a DomainOp component with state changes and business rules.

```bash
riviere builder enrich --component <id> \
  [--stateChange <change>]... [--business-rule <rule>]...
```

**Required:**
| Flag | Description |
|------|-------------|
| `--component <id>` | Component ID (from checklist) |

**Optional (repeatable):**
| Flag | Description |
|------|-------------|
| `--stateChange <change>` | State change: `from:[State],to:[State]` |
| `--business-rule <rule>` | Business rule description |

**State Change Format:** `from:[State],to:[State]`

**Example:**
```bash
riviere builder enrich \
  --component "orders:checkout:domainop:orderbegin" \
  --stateChange "from:[Draft],to:[Placed]" \
  --business-rule "Order must have at least one item" \
  --business-rule "Total must be positive"
```

**Output:** `Enriched {componentId}: {count} state change(s), {count} business rule(s)`

---

## Validation

### `check-consistency`

Check graph consistency for errors and warnings.

```bash
riviere builder check-consistency [--format <format>] [--ignore-orphans <ids>]
```

**Optional:**
| Flag | Description |
|------|-------------|
| `--format <format>` | Output format: `json` \| `text` (default: `text`) |
| `--ignore-orphans <ids>` | Comma-separated component IDs to ignore as orphans |

**Checks:**
- Dangling references (links to non-existent components)
- Unknown domains
- Orphan components (no incoming or outgoing links)

**Text Output:**
```text
Status: CONSISTENT|HAS_WARNINGS|INCONSISTENT
Components: {total}
  By type: {type}={count}, ...
  By domain: {domain}={count}, ...
Links: {total} ({sync} sync, {async} async)

Errors:
  - {error message}

Warnings:
  - ORPHAN: {componentId} (No incoming or outgoing links)
```

**Exit code:** `1` when status is `INCONSISTENT`, otherwise `0`

**Examples:**
```bash
riviere builder check-consistency
riviere builder check-consistency --format json
riviere builder check-consistency --ignore-orphans "orders:api:api:postorders"
```

---

### `validate`

Validate graph against Riviere JSON Schema.

```bash
riviere builder validate [--file <path>]
```

**Optional:**
| Flag | Description |
|------|-------------|
| `--file <path>` | Graph file to validate (default: current graph) |

**Validates:**
1. JSON Schema compliance (structure, required fields, types)
2. Repository references (sourceLocation repos must be in metadata.sources)

**Warnings (non-blocking):**
- Orphan components (no incoming or outgoing links)
- Non-UI/API root components (unusual entry points)
- DomainOp → DomainOp links (usually flows through UseCase)

**Examples:**
```bash
riviere builder validate
riviere builder validate --file ./my-graph.json
```

---

## Discovery

### `component-checklist`

Generate a markdown checklist of components for linking or enriching.

```bash
riviere builder component-checklist --output <file> [--type <type>]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--output <file>` | Output file path |

**Optional:**
| Flag | Description |
|------|-------------|
| `--type <type>` | Filter by component type |

**Output Format:**
```markdown
# Component Checklist

## APIs
- [ ] orders:api:api:postorders (src/api/orders.ts:10)

## Events
- [ ] orders:checkout:event:orderplaced | eventName: "order-placed" (src/events/OrderPlaced.ts:1)
```

**Note:** For Event components, shows `eventName` so you know the event type identifier for linking.

**Examples:**
```bash
riviere builder component-checklist --output ".riviere/step-4-component-checklist.md"
riviere builder component-checklist --output ".riviere/step-5-enrich-checklist.md" --type DomainOp
```

---

### `component-summary`

Generate a summary of all components in the graph.

```bash
riviere builder component-summary --output <file>
```

**Required:**
| Flag | Description |
|------|-------------|
| `--output <file>` | Output file path |

**Example:**
```bash
riviere builder component-summary --output ".riviere/step-3-component-summary.md"
```

---

## Session State

### Graph Storage

The CLI stores graphs as JSON files in the `.riviere/` directory:
- File: `.riviere/{graph-name}.json`
- Contains: version, metadata (name, description, sources, domains), components, links, externalLinks

### Graph Detection

The CLI detects the current graph by finding the first `.json` file in `.riviere/` that:
- Doesn't include "checklist" in filename
- Doesn't include "summary" in filename
- Doesn't include "config" in filename

### Single Graph Model

The CLI uses a single active graph file at a time. To switch graphs, create a new graph with `new-graph`.

---

## Error Messages

Errors include actionable fix suggestions:

```text
Error: {error message}

To fix this:
{actionable suggestion}
```

**Example (no current graph):**

```text
Error: No graph found. Run "riviere builder new-graph --name <name>" first.
```

### Near-Match Suggestions

When a component is not found, the CLI suggests similar components:

```text
Error: Source component not found: "orders:api:postorder"

Did you mean one of these?
  - orders:api:api:postorders
  - orders:api:api:getorders
```

## See Also

- [CLI quick start](/get-started/cli-quick-start)
- [AI extraction](/extract/)
- [Graph structure](/reference/schema/graph-structure)
- [API reference](/reference/api/)
