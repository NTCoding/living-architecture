# riviere-cli Design Refinements

This document captures the refinements applied to the Architect's design using the `separation-of-concerns` and `tactical-ddd` skills.

---

## Separation of Concerns Refinements

### 1. Feature Identification

The Architect identified three features based on command groups (build-graph, extract-components, query-graph). This aligns with the separation-of-concerns principle of verticals, but the feature names could better reflect user goals.

**Refinement:** Rename features to reflect user intentions rather than technical operations:

| Original | Refined | Rationale |
|----------|---------|-----------|
| `build-graph` | `author-architecture` | Users are authoring their architecture, not "building a graph" |
| `extract-components` | `extract-architecture` | Extracting architecture from source code |
| `query-graph` | `explore-architecture` | Users explore and query their documented architecture |

### 2. Domain Folder Content

The Architect placed domain logic like `component-adder.ts` and `custom-property-parser.ts` inside feature domain folders. However, the parsing of custom properties is generic input parsing, not domain logic.

**Refinement:** Move input parsing to entrypoint layer. Domain should only contain business rules and behavior:

- `custom-property-parser.ts` -> entrypoint responsibility (input parsing)
- `component-adder.ts` -> legitimate domain, but evaluate if it adds behavior or is just a pass-through

### 3. Platform Domain Structure

The Architect proposed `platform/domain/` with folders like `component-type/`, `system-type/`, `api-type/`, `link-type/`. These are all type classification concerns.

**Refinement:** These are value objects representing architectural classification concepts. Group by what they represent, not by file:

```text
platform/domain/
├── architectural-classification/
│   ├── component-type.ts      # UI, API, UseCase, DomainOp, Event, EventHandler, Custom
│   ├── system-type.ts         # domain, bff, ui, other
│   ├── api-type.ts            # REST, GraphQL, other
│   └── link-type.ts           # sync, async
├── http-method/
│   └── http-method.ts         # GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
└── cli-output/
    ├── cli-error-code.ts
    └── cli-output-formatter.ts
```

### 4. Infra Layer Scope

The Architect proposed `platform/infra/file-system/` and `platform/infra/graph-persistence/`. The graph persistence layer depends on file-system, but also on schema parsing from `riviere-schema`.

**Refinement:** Keep infra focused on I/O operations only. Schema parsing is not infrastructure:

```text
platform/infra/
├── file-system/
│   └── file-operations.ts     # read, write, exists
└── graph-persistence/
    ├── graph-reader.ts        # reads file, returns parsed graph
    └── graph-writer.ts        # serializes and writes graph
```

### 5. Use-Case Boundaries

The Architect proposed use-cases that map 1:1 to CLI commands. Some of these are not user goals but internal machinery.

**Refinement:** Apply the menu test. What would appear in a "Riviere CLI Features" menu?

User goals (keep as use-cases):
- Initialize architecture documentation
- Add a component
- Link components
- Extract components from source
- Search the architecture
- Trace a flow
- Find orphaned components

Internal machinery (move to domain or remove):
- `check-consistency` - validation rule, not user goal
- `component-checklist` - report format, not user goal
- `component-summary` - report format, not user goal

### 6. Shell Thickness

The Architect kept `bin.ts` and `cli.ts` in shell. `bin.ts` contains error handling logic which violates shell thinness.

**Refinement:** Shell should only wire commands. Error handling should be standardized:

- `shell/cli.ts` - wires all commands together
- `shell/bin.ts` - only parses argv and invokes CLI

Error handling moves to a cross-cutting concern in `platform/infra/error-boundary/`.

---

## Tactical DDD Refinements

### 1. Domain Isolation

Current code in `add-component.ts` (lines 331-380) mixes:
- CLI input parsing (infrastructure)
- File I/O (infrastructure)
- JSON parsing (infrastructure)
- Component creation (domain)
- Output formatting (infrastructure)

**Refinement:** Strict isolation layers:

```typescript
// entrypoint: parse input only
function parseAddComponentInput(options: AddComponentOptions): AddComponentCommand {
  return {
    componentType: parseComponentType(options.type),
    name: options.name,
    domain: options.domain,
    // ...
  }
}

// use-case: orchestrate only
async function addComponent(command: AddComponentCommand): Promise<ComponentId> {
  const graph = await graphReader.load(command.graphPath)
  const architecture = Architecture.resume(graph)
  const componentId = architecture.addComponent(command)
  await graphWriter.save(command.graphPath, architecture.serialize())
  return componentId
}

// domain: business logic only
class Architecture {
  addComponent(command: AddComponentCommand): ComponentId {
    this.validateDomainExists(command.domain)
    this.validateNoDuplicate(command)
    return this.createComponent(command)
  }
}
```

### 2. Rich Domain Language

Current names use technical jargon:
- `RiviereBuilder` - programmer term
- `RiviereQuery` - programmer term
- `loadGraph` / `saveGraph` - technical operation names
- `parseRiviereGraph` - implementation detail in name

**Refinement:** Use domain language that architects would recognize:

| Current | Refined | Rationale |
|---------|---------|-----------|
| `RiviereBuilder` | `Architecture` or `ArchitectureEditor` | What it IS, not how it works |
| `RiviereQuery` | `ArchitectureExplorer` | What users DO with it |
| `loadGraph` | `openArchitecture` | Domain action |
| `saveGraph` | `saveArchitecture` | Domain action |
| `parseRiviereGraph` | internal to `openArchitecture` | Hidden implementation detail |

Note: These are interface names for the CLI. The underlying library names (`RiviereBuilder`, `RiviereQuery`) are external dependencies and should be wrapped.

### 3. Use-Case Orchestration

Current command handlers contain business logic (anemic domain):

```typescript
// Current: business logic in command handler
if (!options.route) {
  throw new MissingRequiredOptionError('route', 'UI')
}
```

**Refinement:** Move validation to domain objects:

```typescript
// Domain object validates itself
class UIComponent {
  static create(input: UIComponentInput): UIComponent {
    if (!input.route) {
      throw new UIComponentRequiresRouteError()
    }
    return new UIComponent(input)
  }
}
```

### 4. Make the Implicit Explicit

Current design has implicit concepts:

**Implicit: Component creation varies by type**
The current `componentAdders` registry maps type flags to functions. This hides the concept of "component type determines creation rules."

**Refinement:** Make component type a first-class polymorphic concept:

```typescript
type ArchitecturalComponent =
  | UIComponent
  | APIComponent
  | UseCaseComponent
  | DomainOpComponent
  | EventComponent
  | EventHandlerComponent
  | CustomComponent

// Each type has its own creation rules, required fields, validation
interface UIComponent {
  kind: 'ui'
  name: ComponentName
  domain: DomainName
  module: ModuleName
  route: Route  // Required - guaranteed to exist
  sourceLocation: SourceLocation
}

interface APIComponent {
  kind: 'api'
  name: ComponentName
  domain: DomainName
  module: ModuleName
  apiType: ApiType  // Required - guaranteed to exist
  httpMethod?: HttpMethod
  httpPath?: string
  sourceLocation: SourceLocation
}
```

**Implicit: Graph path resolution**
The current `resolveGraphPath` hides the concept of "where architecture lives."

**Refinement:** Make architecture location explicit:

```typescript
class ArchitectureLocation {
  static fromOption(path?: string): ArchitectureLocation
  static default(): ArchitectureLocation

  readonly path: string
  exists(): Promise<boolean>
}
```

### 5. Value Objects

Current code uses primitives for domain concepts:

```typescript
// Current: primitives everywhere
options.domain: string
options.module: string
options.repository: string
```

**Refinement:** Extract value objects:

```typescript
class DomainName {
  constructor(readonly value: string) {
    if (!value || value.trim() === '') {
      throw new EmptyDomainNameError()
    }
  }
  equals(other: DomainName): boolean {
    return this.value === other.value
  }
}

class ModuleName { /* similar */ }
class RepositoryUrl { /* similar */ }
class ComponentName { /* similar */ }
class Route { /* similar */ }
```

### 6. Aggregate Design

Current code has no clear aggregate boundaries. Components can be added without proper consistency checks.

**Refinement:** The `Architecture` (currently `RiviereBuilder`) is the aggregate root:

```typescript
class Architecture {
  private domains: Map<DomainName, Domain>
  private components: Map<ComponentId, ArchitecturalComponent>
  private links: Link[]

  // Invariants enforced through the aggregate root:
  // 1. Components must belong to existing domains
  // 2. Component IDs must be unique
  // 3. Links must reference existing components
  // 4. Custom components must use defined custom types

  addDomain(name: DomainName, description?: string): Domain {
    if (this.domains.has(name)) {
      throw new DuplicateDomainError(name)
    }
    const domain = new Domain(name, description)
    this.domains.set(name, domain)
    return domain
  }

  addComponent(input: ComponentInput): ArchitecturalComponent {
    // Invariant 1: domain must exist
    if (!this.domains.has(input.domain)) {
      throw new DomainNotFoundError(input.domain)
    }
    // Invariant 2: no duplicates
    const id = this.generateComponentId(input)
    if (this.components.has(id)) {
      throw new DuplicateComponentError(id)
    }
    const component = this.createComponent(input)
    this.components.set(id, component)
    return component
  }

  link(from: ComponentId, to: ComponentId, type: LinkType): Link {
    // Invariant 3: both components must exist
    if (!this.components.has(from)) {
      throw new ComponentNotFoundError(from)
    }
    if (!this.components.has(to)) {
      throw new ComponentNotFoundError(to)
    }
    const link = new Link(from, to, type)
    this.links.push(link)
    return link
  }
}
```

### 7. Separate Generic Concepts

Current code mixes generic utilities with domain:

- `parseJsonSafely` - generic JSON parsing
- `getErrorMessage` - generic error handling
- CLI output formatting - generic presentation concern

**Refinement:** Move generic utilities to `platform/infra/`:

```text
platform/infra/
├── json/
│   └── json-parser.ts         # parseJsonSafely
├── error-handling/
│   └── error-message.ts       # getErrorMessage
└── cli-presentation/
    └── output-formatter.ts    # formatError, formatSuccess
```

---

## Summary of Refinements

| Area | Original | Refined |
|------|----------|---------|
| Feature names | Technical (build-graph) | User-oriented (author-architecture) |
| Domain language | Programmer jargon (RiviereBuilder) | Domain terms (Architecture) |
| Value objects | Primitives (string) | Domain types (DomainName) |
| Business logic | In command handlers | In domain objects |
| Aggregate design | None | Architecture as aggregate root |
| Generic utilities | Mixed with domain | Isolated in platform/infra |
| Component types | Registry mapping | Polymorphic discriminated union |
| Error handling | Per-command | Centralized error boundary |
