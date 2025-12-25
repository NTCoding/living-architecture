# API Reference

**Schema version:** `v1.0`

## RiviereBuilder

The main class. Create an instance, add components, connect them, build a graph.

```typescript
import { RiviereBuilder } from '@living-architecture/riviere-builder'

const builder = new RiviereBuilder({
  sources: [{ repository: 'your-repo' }],
  domains: {
    orders: { description: 'Order management', systemType: 'domain' }
  }
})
```

### Add components

| Method | Purpose |
|--------|---------|
| [`addUI()`](./riviere-builder#addui) | User interface entry points |
| [`addApi()`](./riviere-builder#addapi) | REST or GraphQL endpoints |
| [`addUseCase()`](./riviere-builder#addusecase) | Application layer orchestration |
| [`addDomainOp()`](./riviere-builder#adddomainop) | Domain logic operations |
| [`addEvent()`](./riviere-builder#addevent) | Published domain events |
| [`addEventHandler()`](./riviere-builder#addeventhandler) | Event subscribers |
| [`defineCustomType()`](./riviere-builder#definecustomtype) | Register a custom component type |
| [`addCustom()`](./riviere-builder#addcustom) | Add instance of registered custom type |

### Link components

```typescript
builder.link(api, useCase, 'sync')
builder.link(useCase, event, 'async')
```

### Find components

| Method | Use Case |
|--------|----------|
| [`findComponent(criteria)`](./riviere-builder#findcomponent) | Find by source location or properties |
| [`find(predicate)`](./riviere-builder#find) | Find with custom function |
| [`findAll(predicate)`](./riviere-builder#findall) | Find all matching |
| [`nearMatches(criteria)`](./riviere-builder#nearmatches) | Find similar when exact match fails |
| [`getComponents()`](./riviere-builder#getcomponents) | Get all components |

### Enrichment

| Method | Use Case |
|--------|----------|
| [`enrichComponent()`](./riviere-builder#enrichcomponent) | Add state changes or business rules to existing DomainOp |

### Build and validate

| Method | Purpose |
|--------|---------|
| [`validate()`](./riviere-builder#validate) | Check graph validity without building |
| [`stats()`](./riviere-builder#stats) | Component/link/warning counts |
| [`orphans()`](./riviere-builder#orphans) | Find unconnected components |
| [`warnings()`](./riviere-builder#warnings) | Get warning messages |
| [`build()`](./riviere-builder#build) | Validate and produce final graph |
| [`query()`](./riviere-builder#query) | Get query client for analysis |

---

## RiviereQuery

Query and analyze Riviere graphs.

```typescript
// From builder
const query = builder.query()

// From JSON file
const query = RiviereQuery.fromJSON(jsonContents)
```

### Component methods

| Method | Purpose |
|--------|---------|
| [`components()`](./generated/riviere-query/classes/RiviereQuery#components) | Get all components |
| [`componentById(id)`](./generated/riviere-query/classes/RiviereQuery#componentbyid) | Find component by ID |
| [`componentsInDomain(domainId)`](./generated/riviere-query/classes/RiviereQuery#componentsindomain) | Components in a domain |
| [`componentsByType(type)`](./generated/riviere-query/classes/RiviereQuery#componentsbytype) | Components of a type |
| [`find(predicate)`](./generated/riviere-query/classes/RiviereQuery#find) | Find with custom function |
| [`findAll(predicate)`](./generated/riviere-query/classes/RiviereQuery#findall) | Find all matching |

### Link methods

| Method | Purpose |
|--------|---------|
| [`links()`](./generated/riviere-query/classes/RiviereQuery#links) | Get all links |

### Domain methods

| Method | Purpose |
|--------|---------|
| [`domains()`](./generated/riviere-query/classes/RiviereQuery#domains) | Domain info with component counts |
| [`entities(domainId?)`](./generated/riviere-query/classes/RiviereQuery#entities) | Entity names in domain |
| [`crossDomainLinks(domainId)`](./generated/riviere-query/classes/RiviereQuery#crossdomainlinks) | Links leaving domain |

### Analysis methods

| Method | Purpose |
|--------|---------|
| [`entryPoints()`](./generated/riviere-query/classes/RiviereQuery#entrypoints) | UI/API/EventHandler with no incoming links |

---

## Full Documentation

- [RiviereBuilder](./riviere-builder) — Build graphs with type-safe methods
- [RiviereQuery](./generated/riviere-query/classes/RiviereQuery) — Query and analyze graphs
- [Types](./generated/riviere-query/README) — All TypeScript type definitions

## See also

- [CLI reference](/cli/cli-reference)
- [Graph structure](/concepts/graph-structure)
