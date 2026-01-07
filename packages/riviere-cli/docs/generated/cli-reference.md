---
pageClass: reference
---

# CLI Command Reference

> This file is auto-generated from CLI command definitions.
> Do not edit manually. Run `nx generate-docs riviere-cli` to regenerate.

Complete documentation for all Riviere CLI commands.

## Installation

```bash
npm install @living-architecture/riviere-cli
```

## Usage

```bash
riviere builder <command> [options]  # Graph building commands
riviere query <command> [options]    # Graph query commands
```

## Exit Codes

- `0`: Success (including warnings)
- `1`: Error or failed validation/consistency

---

## Builder Commands

Commands for constructing architecture graphs.

### `add-component`

Add a component to the graph

```bash
riviere builder add-component [options]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--type <type>` | Component type (UI, API, UseCase, DomainOp, Event, EventHandler, Custom) |
| `--name <name>` | Component name |
| `--domain <domain>` | Domain name |
| `--module <module>` | Module name |
| `--repository <url>` | Source repository URL |
| `--file-path <path>` | Source file path |
| `--route <route>` | UI route path |
| `--api-type <type>` | API type (REST, GraphQL, other) |
| `--http-method <method>` | HTTP method |
| `--http-path <path>` | HTTP endpoint path |
| `--operation-name <name>` | Operation name (DomainOp) |
| `--entity <entity>` | Entity name (DomainOp) |
| `--event-name <name>` | Event name |
| `--event-schema <schema>` | Event schema definition |
| `--subscribed-events <events>` | Comma-separated subscribed event names |
| `--custom-type <name>` | Custom type name |
| `--custom-property <key:value>` | Custom property (repeatable) |
| `--description <desc>` | Component description |
| `--line-number <n>` | Source line number |
| `--graph <path>` | Custom graph file path (default: .riviere/graph.json) |

**Optional:**
| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

**Examples:**
```bash
# Add an API endpoint
riviere builder add-component --type API --name "place-order" \
  --domain orders --module api --repository ecommerce \
  --file-path src/api/orders.ts --api-type REST \
  --http-method POST --http-path /orders
# Add a UseCase
riviere builder add-component --type UseCase --name "place-order" \
  --domain orders --module checkout --repository ecommerce \
  --file-path src/usecases/PlaceOrder.ts
# Add a DomainOp
riviere builder add-component --type DomainOp --name "order-begin" \
  --domain orders --module domain --repository ecommerce \
  --file-path src/domain/Order.ts --entity Order --operation-name begin
# Add an Event
riviere builder add-component --type Event --name "order-placed" \
  --domain orders --module events --repository ecommerce \
  --file-path src/events/OrderPlaced.ts --event-name "order-placed" \
  --event-schema "{ orderId: string, total: number }"
```

---

### `add-domain`

Add a domain to the graph

```bash
riviere builder add-domain [options]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--name <name>` | Domain name |
| `--description <description>` | Domain description |
| `--system-type <type>` | System type (domain, bff, ui, other) |
| `--graph <path>` | Custom graph file path (default: .riviere/graph.json) |

**Optional:**
| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

**Examples:**
```bash
riviere builder add-domain --name orders --system-type domain \
  --description "Order management"
riviere builder add-domain --name checkout-bff --system-type bff \
  --description "Checkout backend-for-frontend"
```

---

### `add-source`

Add a source repository to the graph

```bash
riviere builder add-source [options]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--repository <url>` | Source repository URL |
| `--graph <path>` | Custom graph file path (default: .riviere/graph.json) |

**Optional:**
| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

**Examples:**
```bash
riviere builder add-source --repository https://github.com/your-org/orders-service
riviere builder add-source --repository https://github.com/your-org/payments-api --json
```

---

### `init`

Initialize a new graph

```bash
riviere builder init [options]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--name <name>` | System name |
| `--graph <path>` | Custom graph file path (default: .riviere/graph.json) |
| `--source <url>` | Source repository URL (repeatable) |
| `--domain <json>` | Domain as JSON (repeatable) |

**Optional:**
| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

**Examples:**
```bash
riviere builder init --source https://github.com/your-org/your-repo \
  --domain '{"name":"orders","description":"Order management","systemType":"domain"}'
riviere builder init --name "ecommerce" \
  --source https://github.com/your-org/orders \
  --source https://github.com/your-org/payments \
  --domain '{"name":"orders","description":"Order management","systemType":"domain"}' \
  --domain '{"name":"payments","description":"Payment processing","systemType":"domain"}'
```

---

### `link`

Link two components

```bash
riviere builder link [options]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--from <component-id>` | Source component ID |
| `--to-domain <domain>` | Target domain |
| `--to-module <module>` | Target module |
| `--to-type <type>` | Target component type (UI, API, UseCase, DomainOp, Event, EventHandler, Custom) |
| `--to-name <name>` | Target component name |
| `--link-type <type>` | Link type (sync, async) |
| `--graph <path>` | Custom graph file path (default: .riviere/graph.json) |

**Optional:**
| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

**Examples:**
```bash
riviere builder link \
  --from "orders:api:api:postorders" \
  --to-domain orders --to-module checkout --to-type UseCase --to-name "place-order" \
  --link-type sync
riviere builder link \
  --from "orders:checkout:domainop:orderbegin" \
  --to-domain orders --to-module events --to-type Event --to-name "order-placed" \
  --link-type async
```

---

### `link-external`

Link a component to an external system

```bash
riviere builder link-external [options]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--from <component-id>` | Source component ID |
| `--target-name <name>` | External target name |
| `--target-domain <domain>` | External target domain |
| `--target-url <url>` | External target URL |
| `--link-type <type>` | Link type (sync, async) |
| `--graph <path>` | Custom graph file path (default: .riviere/graph.json) |

**Optional:**
| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

**Examples:**
```bash
riviere builder link-external \
  --from "payments:gateway:usecase:processpayment" \
  --target-name "Stripe" \
  --target-url "https://api.stripe.com" \
  --link-type sync
riviere builder link-external \
  --from "shipping:tracking:usecase:updatetracking" \
  --target-name "FedEx API" \
  --target-domain "shipping" \
  --link-type async
```

---

### `link-http`

Find an API by HTTP path and link to a target component

```bash
riviere builder link-http [options]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--path <http-path>` | HTTP path to match |
| `--to-domain <domain>` | Target domain |
| `--to-module <module>` | Target module |
| `--to-type <type>` | Target component type |
| `--to-name <name>` | Target component name |
| `--method <method>` | Filter by HTTP method (GET, POST, PUT, PATCH, DELETE) |
| `--link-type <type>` | Link type (sync, async) |
| `--graph <path>` | Custom graph file path (default: .riviere/graph.json) |

**Optional:**
| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

**Examples:**
```bash
riviere builder link-http \
  --path "/orders" --method POST \
  --to-domain orders --to-module checkout --to-type UseCase --to-name "place-order"
riviere builder link-http \
  --path "/users/{id}" --method GET \
  --to-domain users --to-module queries --to-type UseCase --to-name "get-user" \
  --link-type sync
```

---

### `validate`

Validate the graph for errors and warnings

```bash
riviere builder validate [options]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--graph <path>` | Custom graph file path (default: .riviere/graph.json) |

**Optional:**
| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

**Examples:**
```bash
riviere builder validate
riviere builder validate --json
riviere builder validate --graph .riviere/my-graph.json
```

---

### `finalize`

Validate and export the final graph

```bash
riviere builder finalize [options]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--graph <path>` | Custom graph file path (default: .riviere/graph.json) |
| `--output <path>` | Output path for finalized graph (defaults to input path) |

**Optional:**
| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

**Examples:**
```bash
riviere builder finalize
riviere builder finalize --output ./dist/architecture.json
riviere builder finalize --json
```

---

### `enrich`

Enrich a DomainOp component with semantic information. Note: Enrichment is additive — running multiple times accumulates values.

```bash
riviere builder enrich [options]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--id <component-id>` | Component ID to enrich |
| `--entity <name>` | Entity name |
| `--state-change <from:to>` | State transition (repeatable) |
| `--business-rule <rule>` | Business rule (repeatable) |
| `--reads <value>` | What the operation reads (repeatable) |
| `--validates <value>` | What the operation validates (repeatable) |
| `--modifies <value>` | What the operation modifies (repeatable) |
| `--emits <value>` | What the operation emits (repeatable) |
| `--signature <dsl>` | Operation signature (e.g., "orderId:string, amount:number -> Order") |
| `--graph <path>` | Custom graph file path (default: .riviere/graph.json) |

**Optional:**
| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

**Examples:**
```bash
riviere builder enrich \
  --id "orders:checkout:domainop:orderbegin" \
  --entity Order \
  --state-change "Draft:Placed" \
  --business-rule "Order must have at least one item" \
  --reads "this.items" \
  --validates "items.length > 0" \
  --modifies "this.state <- Placed" \
  --emits "OrderPlaced event"
riviere builder enrich \
  --id "payments:gateway:domainop:paymentprocess" \
  --state-change "Pending:Processing" \
  --reads "amount parameter" \
  --validates "amount > 0" \
  --modifies "this.status <- Processing"
```

---

### `component-summary`

Show component counts by type and domain

```bash
riviere builder component-summary [options]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--graph <path>` | Custom graph file path (default: .riviere/graph.json) |

**Examples:**
```bash
riviere builder component-summary
riviere builder component-summary > summary.json
```

---

### `component-checklist`

List components as a checklist for linking/enrichment

```bash
riviere builder component-checklist [options]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--graph <path>` | Custom graph file path (default: .riviere/graph.json) |
| `--type <type>` | Filter by component type |

**Optional:**
| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

**Examples:**
```bash
riviere builder component-checklist
riviere builder component-checklist --type DomainOp
riviere builder component-checklist --type API --json
```

---

### `check-consistency`

Check for structural issues in the graph

```bash
riviere builder check-consistency [options]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--graph <path>` | Custom graph file path (default: .riviere/graph.json) |

**Optional:**
| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

**Examples:**
```bash
riviere builder check-consistency
riviere builder check-consistency --json
```

---

### `define-custom-type`

Define a custom component type

```bash
riviere builder define-custom-type [options]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--name <name>` | Custom type name |
| `--description <desc>` | Custom type description |
| `--required-property <spec>` | Required property (format: name:type[:description]) |
| `--optional-property <spec>` | Optional property (format: name:type[:description]) |
| `--graph <path>` | Custom graph file path (default: .riviere/graph.json) |

**Optional:**
| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

---

## Query Commands

Commands for analyzing and querying graphs.

### `entry-points`

List entry points (APIs, UIs, EventHandlers with no incoming links)

```bash
riviere query entry-points [options]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--graph <path>` | Custom graph file path (default: .riviere/graph.json) |

**Optional:**
| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

**Examples:**
```bash
riviere query entry-points
riviere query entry-points --json
```

---

### `domains`

List domains with component counts

```bash
riviere query domains [options]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--graph <path>` | Custom graph file path (default: .riviere/graph.json) |

**Optional:**
| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

**Examples:**
```bash
riviere query domains
riviere query domains --json
```

---

### `trace`

Trace flow from a component (bidirectional)

```bash
riviere query trace <componentId> [options]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `<componentId>` | Component ID to trace from |

**Required:**
| Flag | Description |
|------|-------------|
| `--graph <path>` | Custom graph file path (default: .riviere/graph.json) |

**Optional:**
| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

**Examples:**
```bash
riviere query trace "orders:api:api:postorders"
riviere query trace "orders:checkout:usecase:placeorder" --json
```

---

### `orphans`

Find orphan components with no links

```bash
riviere query orphans [options]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--graph <path>` | Custom graph file path (default: .riviere/graph.json) |

**Optional:**
| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

**Examples:**
```bash
riviere query orphans
riviere query orphans --json
```

---

### `components`

List components with optional filtering

```bash
riviere query components [options]
```

**Required:**
| Flag | Description |
|------|-------------|
| `--graph <path>` | Custom graph file path (default: .riviere/graph.json) |
| `--domain <name>` | Filter by domain name |
| `--type <type>` | Filter by component type |

**Optional:**
| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

**Examples:**
```bash
riviere query components
riviere query components --domain orders
riviere query components --type API --json
riviere query components --domain orders --type UseCase
```

---

### `search`

Search components by name

```bash
riviere query search <term> [options]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `<term>` | Search term |

**Required:**
| Flag | Description |
|------|-------------|
| `--graph <path>` | Custom graph file path (default: .riviere/graph.json) |

**Optional:**
| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

**Examples:**
```bash
riviere query search order
riviere query search "place-order" --json
```

---

## See Also

- [CLI Quick Start](/get-started/cli-quick-start)
- [Extraction Workflow](/extract/)
- [Graph Structure](/reference/schema/graph-structure)
