# API Reference

## RiviereBuilder

The main class. Create an instance, add components, connect them, build a graph.

```typescript
import { RiviereBuilder } from '@living-architecture/riviere-builder'

const builder = RiviereBuilder.new({
  sources: [{ type: 'git', url: 'https://github.com/your-org/your-repo' }],
  domains: {
    orders: { description: 'Order management', systemType: 'domain' }
  }
})
```

### Add components

| Method | Purpose |
|--------|---------|
| [`addUI()`](/reference/api/generated/riviere-builder/classes/RiviereBuilder#addui) | User interface entry points |
| [`addApi()`](/reference/api/generated/riviere-builder/classes/RiviereBuilder#addapi) | REST or GraphQL endpoints |
| [`addUseCase()`](/reference/api/generated/riviere-builder/classes/RiviereBuilder#addusecase) | Application layer orchestration |
| [`addDomainOp()`](/reference/api/generated/riviere-builder/classes/RiviereBuilder#adddomainop) | Domain logic operations |
| [`addEvent()`](/reference/api/generated/riviere-builder/classes/RiviereBuilder#addevent) | Published domain events |
| [`addEventHandler()`](/reference/api/generated/riviere-builder/classes/RiviereBuilder#addeventhandler) | Event subscribers |
| [`defineCustomType()`](/reference/api/generated/riviere-builder/classes/RiviereBuilder#definecustomtype) | Register a custom component type |
| [`addCustom()`](/reference/api/generated/riviere-builder/classes/RiviereBuilder#addcustom) | Add instance of registered custom type |

### Link components

```typescript
builder.link({ from: api.id, to: useCase.id, type: 'sync' })
```

### Find components

| Method | Use Case |
|--------|----------|
| [`nearMatches(criteria)`](/reference/api/generated/riviere-builder/classes/RiviereBuilder#nearmatches) | Find similar when exact match fails |

### Enrichment

| Method | Use Case |
|--------|----------|
| [`enrichComponent()`](/reference/api/generated/riviere-builder/classes/RiviereBuilder#enrichcomponent) | Add state changes or business rules to existing DomainOp |

### Build and validate

| Method | Purpose |
|--------|---------|
| [`validate()`](/reference/api/generated/riviere-builder/classes/RiviereBuilder#validate) | Check graph validity without building |
| [`stats()`](/reference/api/generated/riviere-builder/classes/RiviereBuilder#stats) | Component/link/warning counts |
| [`orphans()`](/reference/api/generated/riviere-builder/classes/RiviereBuilder#orphans) | Find unconnected components |
| [`warnings()`](/reference/api/generated/riviere-builder/classes/RiviereBuilder#warnings) | Get warning messages |
| [`build()`](/reference/api/generated/riviere-builder/classes/RiviereBuilder#build) | Validate and produce final graph |
| [`query()`](/reference/api/generated/riviere-builder/classes/RiviereBuilder#query) | Get query client for analysis |

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
| [`components()`](/reference/api/generated/riviere-query/classes/RiviereQuery#components) | Get all components |
| [`componentById(id)`](/reference/api/generated/riviere-query/classes/RiviereQuery#componentbyid) | Find component by ID |
| [`componentsInDomain(domainId)`](/reference/api/generated/riviere-query/classes/RiviereQuery#componentsindomain) | Components in a domain |
| [`componentsByType(type)`](/reference/api/generated/riviere-query/classes/RiviereQuery#componentsbytype) | Components of a type |
| [`find(predicate)`](/reference/api/generated/riviere-query/classes/RiviereQuery#find) | Find with custom function |
| [`findAll(predicate)`](/reference/api/generated/riviere-query/classes/RiviereQuery#findall) | Find all matching |

### Link methods

| Method | Purpose |
|--------|---------|
| [`links()`](/reference/api/generated/riviere-query/classes/RiviereQuery#links) | Get all links |

### Domain methods

| Method | Purpose |
|--------|---------|
| [`domains()`](/reference/api/generated/riviere-query/classes/RiviereQuery#domains) | Domain info with component counts |
| [`entities(domainId?)`](/reference/api/generated/riviere-query/classes/RiviereQuery#entities) | Entity names in domain |
| [`crossDomainLinks(domainId)`](/reference/api/generated/riviere-query/classes/RiviereQuery#crossdomainlinks) | Links leaving domain |

### Analysis methods

| Method | Purpose |
|--------|---------|
| [`entryPoints()`](/reference/api/generated/riviere-query/classes/RiviereQuery#entrypoints) | UI/API/EventHandler with no incoming links |

---

## Full Documentation

- [RiviereBuilder](/reference/api/generated/riviere-builder/classes/RiviereBuilder) — Build graphs with type-safe methods
- [RiviereQuery](/reference/api/generated/riviere-query/classes/RiviereQuery) — Query and analyze graphs
- [Types](/reference/api/generated/riviere-query/README) — All TypeScript type definitions

## See Also

- [CLI reference](/reference/cli/cli-reference)
- [Graph structure](/reference/schema/graph-structure)
