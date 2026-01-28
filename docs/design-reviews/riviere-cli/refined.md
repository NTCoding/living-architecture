# riviere-cli Refined Design

## Refined Structure

```text
packages/riviere-cli/src/
├── features/
│   ├── author-architecture/
│   │   ├── entrypoint/
│   │   │   ├── add-component-command.ts
│   │   │   ├── add-domain-command.ts
│   │   │   ├── add-source-command.ts
│   │   │   ├── define-custom-type-command.ts
│   │   │   ├── enrich-command.ts
│   │   │   ├── finalize-command.ts
│   │   │   ├── init-command.ts
│   │   │   ├── link-command.ts
│   │   │   ├── link-external-command.ts
│   │   │   ├── link-http-command.ts
│   │   │   └── validate-command.ts
│   │   ├── use-cases/
│   │   │   ├── initialize-architecture.ts
│   │   │   ├── add-component.ts
│   │   │   ├── add-domain.ts
│   │   │   ├── link-components.ts
│   │   │   ├── link-external-system.ts
│   │   │   └── validate-architecture.ts
│   │   └── domain/
│   │       ├── architecture.ts
│   │       ├── domain.ts
│   │       └── components/
│   │           ├── ui-component.ts
│   │           ├── api-component.ts
│   │           ├── use-case-component.ts
│   │           ├── domain-op-component.ts
│   │           ├── event-component.ts
│   │           ├── event-handler-component.ts
│   │           └── custom-component.ts
│   │
│   ├── extract-architecture/
│   │   ├── entrypoint/
│   │   │   └── extract-command.ts
│   │   ├── use-cases/
│   │   │   └── extract-from-source.ts
│   │   └── domain/
│   │       ├── extraction-config.ts
│   │       └── module-ref-resolver.ts
│   │
│   └── explore-architecture/
│       ├── entrypoint/
│       │   ├── components-command.ts
│       │   ├── domains-command.ts
│       │   ├── entry-points-command.ts
│       │   ├── orphans-command.ts
│       │   ├── search-command.ts
│       │   └── trace-command.ts
│       ├── use-cases/
│       │   ├── list-components.ts
│       │   ├── list-domains.ts
│       │   ├── find-entry-points.ts
│       │   ├── find-orphans.ts
│       │   ├── search-architecture.ts
│       │   └── trace-flow.ts
│       └── domain/
│           └── component-display.ts
│
├── platform/
│   ├── domain/
│   │   ├── architectural-classification/
│   │   │   ├── component-type.ts
│   │   │   ├── system-type.ts
│   │   │   ├── api-type.ts
│   │   │   └── link-type.ts
│   │   ├── http-method/
│   │   │   └── http-method.ts
│   │   └── value-objects/
│   │       ├── domain-name.ts
│   │       ├── module-name.ts
│   │       ├── component-name.ts
│   │       ├── component-id.ts
│   │       ├── repository-url.ts
│   │       ├── route.ts
│   │       └── source-location.ts
│   │
│   └── infra/
│       ├── file-system/
│       │   └── file-operations.ts
│       ├── architecture-persistence/
│       │   ├── architecture-reader.ts
│       │   └── architecture-writer.ts
│       ├── json/
│       │   └── json-parser.ts
│       ├── error-handling/
│       │   └── error-boundary.ts
│       └── cli-presentation/
│           ├── cli-error-code.ts
│           └── output-formatter.ts
│
└── shell/
    ├── bin.ts
    └── cli.ts
```

---

## Separation of Concerns Checklist

1. [x] Verify features/, platform/, shell/ exist at the root of the package
2. [x] Verify platform/ contains only domain/ and infra/
3. [x] Verify each feature contains only entrypoint/, use-cases/, domain/
4. [x] Verify shell/ contains no business logic
5. [x] Verify code belonging to one feature is in features/[feature]/
6. [x] Verify shared business logic is in platform/domain/ and no dependencies between features
7. [x] Verify external service wrappers are in platform/infra/
8. [x] Verify custom folders (steps/, handlers/) are inside domain/, not use-cases/
9. [x] Verify each function relies on same state as others in its class/file and name aligns
10. [x] Verify each file name relates to other files in its directory
11. [x] Verify each directory name describes what all files inside have in common
12. [x] Verify use-cases/ contains only use-case files (no nested folders, no helper files)
13. [x] Verify no generic type-grouping files (types.ts, errors.ts, validators.ts) spanning multiple capabilities
14. [x] Verify entrypoint/ is thin (parse input -> invoke use-case -> map output) and never imports from domain/

---

## Tactical DDD Checklist

1. [x] Verify domain is isolated from infrastructure (no DB/HTTP/logging in domain; generic utilities in infra; domain doesn't import infra)
2. [x] Verify names are from YOUR domain, not generic developer jargon
3. [x] Verify use cases are intentions of users, human or automated (apply the menu test)
4. [x] Verify business logic lives in domain objects, use cases only orchestrate
5. [x] Verify states are modeled as distinct types where appropriate
6. [x] Verify hidden domain concepts are extracted and named explicitly
7. [x] Verify aggregates are designed around invariants, not naive mapping of domain nouns
8. [x] Verify values are extracted into value objects expressing a domain concept

---

## Key Design Elements

### 1. Thin Entrypoints

Each command file parses CLI input, invokes a use-case, and formats output:

```typescript
export function createAddComponentCommand(): Command {
  return new Command('add-component')
    .description('Add a component to the architecture')
    .requiredOption('--type <type>', 'Component type')
    .requiredOption('--name <name>', 'Component name')
    .requiredOption('--domain <domain>', 'Domain name')
    .action(async (options: AddComponentOptions) => {
      const command = parseAddComponentInput(options)
      const result = await addComponent(command)
      console.log(formatAddComponentResult(result))
    })
}

function parseAddComponentInput(options: AddComponentOptions): AddComponentCommand {
  return {
    architecturePath: ArchitectureLocation.fromOption(options.graph),
    componentType: ComponentType.parse(options.type),
    name: new ComponentName(options.name),
    domain: new DomainName(options.domain),
    module: new ModuleName(options.module),
    sourceLocation: new SourceLocation(options.repository, options.filePath, options.lineNumber),
    typeSpecificInput: parseTypeSpecificInput(options),
  }
}
```

### 2. Use-Cases Orchestrate

Use-cases coordinate between infrastructure and domain without containing business logic:

```typescript
export async function addComponent(command: AddComponentCommand): Promise<AddComponentResult> {
  const architecture = await architectureReader.open(command.architecturePath)

  const componentId = architecture.addComponent({
    type: command.componentType,
    name: command.name,
    domain: command.domain,
    module: command.module,
    sourceLocation: command.sourceLocation,
    ...command.typeSpecificInput,
  })

  await architectureWriter.save(command.architecturePath, architecture)

  return { componentId }
}
```

### 3. Architecture as Aggregate Root

The `Architecture` class protects all invariants:

```typescript
class Architecture {
  private readonly metadata: ArchitectureMetadata
  private readonly domains: Map<string, Domain>
  private readonly components: Map<string, ArchitecturalComponent>
  private readonly links: Link[]
  private readonly customTypes: Map<string, CustomTypeDefinition>

  addDomain(name: DomainName, description?: string): Domain {
    if (this.domains.has(name.value)) {
      throw new DuplicateDomainError(name)
    }
    const domain = new Domain(name, description)
    this.domains.set(name.value, domain)
    return domain
  }

  addComponent(input: AddComponentInput): ComponentId {
    const domain = this.domains.get(input.domain.value)
    if (!domain) {
      throw new DomainNotFoundError(input.domain)
    }

    const componentId = this.generateComponentId(input)
    if (this.components.has(componentId.value)) {
      throw new DuplicateComponentError(componentId)
    }

    const component = this.createTypedComponent(input)
    this.components.set(componentId.value, component)
    return componentId
  }

  link(from: ComponentId, to: ComponentId, linkType: LinkType): Link {
    if (!this.components.has(from.value)) {
      throw new ComponentNotFoundError(from)
    }
    if (!this.components.has(to.value)) {
      throw new ComponentNotFoundError(to)
    }

    const link = new Link(from, to, linkType)
    this.links.push(link)
    return link
  }

  private createTypedComponent(input: AddComponentInput): ArchitecturalComponent {
    switch (input.type.value) {
      case 'UI':
        return UIComponent.create(input)
      case 'API':
        return APIComponent.create(input)
      case 'UseCase':
        return UseCaseComponent.create(input)
      case 'DomainOp':
        return DomainOpComponent.create(input)
      case 'Event':
        return EventComponent.create(input)
      case 'EventHandler':
        return EventHandlerComponent.create(input)
      case 'Custom':
        return this.createCustomComponent(input)
    }
  }

  private createCustomComponent(input: AddComponentInput): CustomComponent {
    if (!input.customTypeName) {
      throw new CustomTypeRequiredError()
    }
    const customType = this.customTypes.get(input.customTypeName.value)
    if (!customType) {
      throw new CustomTypeNotFoundError(input.customTypeName)
    }
    return CustomComponent.create(input, customType)
  }
}
```

### 4. Typed Components with Discriminated Union

Each component type has its own validation and required fields:

```typescript
type ArchitecturalComponent =
  | UIComponent
  | APIComponent
  | UseCaseComponent
  | DomainOpComponent
  | EventComponent
  | EventHandlerComponent
  | CustomComponent

class UIComponent {
  readonly kind = 'ui' as const
  readonly name: ComponentName
  readonly domain: DomainName
  readonly module: ModuleName
  readonly route: Route
  readonly sourceLocation: SourceLocation

  private constructor(input: UIComponentInput) {
    this.name = input.name
    this.domain = input.domain
    this.module = input.module
    this.route = input.route
    this.sourceLocation = input.sourceLocation
  }

  static create(input: AddComponentInput): UIComponent {
    if (!input.route) {
      throw new UIComponentRequiresRouteError(input.name)
    }
    return new UIComponent({
      name: input.name,
      domain: input.domain,
      module: input.module,
      route: input.route,
      sourceLocation: input.sourceLocation,
    })
  }
}

class APIComponent {
  readonly kind = 'api' as const
  readonly name: ComponentName
  readonly domain: DomainName
  readonly module: ModuleName
  readonly apiType: ApiType
  readonly httpMethod?: HttpMethod
  readonly httpPath?: string
  readonly sourceLocation: SourceLocation

  static create(input: AddComponentInput): APIComponent {
    if (!input.apiType) {
      throw new APIComponentRequiresApiTypeError(input.name)
    }
    return new APIComponent({
      name: input.name,
      domain: input.domain,
      module: input.module,
      apiType: input.apiType,
      httpMethod: input.httpMethod,
      httpPath: input.httpPath,
      sourceLocation: input.sourceLocation,
    })
  }
}
```

### 5. Value Objects

All domain primitives are wrapped in value objects:

```typescript
class DomainName {
  readonly value: string

  constructor(value: string) {
    if (!value || value.trim() === '') {
      throw new EmptyDomainNameError()
    }
    this.value = value.trim()
  }

  equals(other: DomainName): boolean {
    return this.value === other.value
  }
}

class ComponentType {
  private static readonly VALID_TYPES = ['UI', 'API', 'UseCase', 'DomainOp', 'Event', 'EventHandler', 'Custom'] as const
  readonly value: typeof ComponentType.VALID_TYPES[number]

  private constructor(value: typeof ComponentType.VALID_TYPES[number]) {
    this.value = value
  }

  static parse(input: string): ComponentType {
    const normalized = ComponentType.VALID_TYPES.find(t => t.toLowerCase() === input.toLowerCase())
    if (!normalized) {
      throw new InvalidComponentTypeError(input, ComponentType.VALID_TYPES)
    }
    return new ComponentType(normalized)
  }
}

class SourceLocation {
  readonly repository: RepositoryUrl
  readonly filePath: string
  readonly lineNumber?: number

  constructor(repository: string, filePath: string, lineNumber?: string) {
    this.repository = new RepositoryUrl(repository)
    this.filePath = filePath
    this.lineNumber = lineNumber ? parseInt(lineNumber, 10) : undefined
  }
}
```

### 6. Architecture Persistence (Infra)

File I/O is isolated in the infrastructure layer:

```typescript
class ArchitectureReader {
  constructor(
    private readonly fileOps: FileOperations,
    private readonly jsonParser: JsonParser,
  ) {}

  async open(location: ArchitectureLocation): Promise<Architecture> {
    const exists = await this.fileOps.exists(location.path)
    if (!exists) {
      throw new ArchitectureNotFoundError(location)
    }

    const content = await this.fileOps.read(location.path)
    const data = this.jsonParser.parse(content)
    return Architecture.fromSerializedGraph(data)
  }
}

class ArchitectureWriter {
  constructor(private readonly fileOps: FileOperations) {}

  async save(location: ArchitectureLocation, architecture: Architecture): Promise<void> {
    const serialized = architecture.serialize()
    await this.fileOps.write(location.path, serialized)
  }
}
```

### 7. Error Boundary (Infra)

Centralized error handling for CLI output:

```typescript
class ErrorBoundary {
  constructor(private readonly formatter: OutputFormatter) {}

  wrap<T>(fn: () => Promise<T>): Promise<void> {
    return fn()
      .then(result => {
        console.log(this.formatter.formatSuccess(result))
      })
      .catch(error => {
        console.log(this.formatter.formatError(this.toCliError(error)))
      })
  }

  private toCliError(error: unknown): CliError {
    if (error instanceof DomainNotFoundError) {
      return {
        code: CliErrorCode.DomainNotFound,
        message: error.message,
        suggestions: ['Run riviere builder add-domain first'],
      }
    }
    if (error instanceof ArchitectureNotFoundError) {
      return {
        code: CliErrorCode.GraphNotFound,
        message: error.message,
        suggestions: ['Run riviere builder init first'],
      }
    }
    return {
      code: CliErrorCode.UnknownError,
      message: error instanceof Error ? error.message : 'Unknown error',
      suggestions: [],
    }
  }
}
```

### 8. Shell (Thin Wiring)

The shell only wires commands together:

```typescript
export function createCli(): Command {
  const program = new Command()
    .name('riviere')
    .description('Riviere architecture CLI')
    .version(version)

  const builder = program.command('builder').description('Author architecture')
  builder.addCommand(createInitCommand())
  builder.addCommand(createAddDomainCommand())
  builder.addCommand(createAddComponentCommand())
  builder.addCommand(createLinkCommand())
  builder.addCommand(createValidateCommand())

  const extract = program.command('extract').description('Extract architecture')
  extract.addCommand(createExtractCommand())

  const query = program.command('query').description('Explore architecture')
  query.addCommand(createComponentsCommand())
  query.addCommand(createDomainsCommand())
  query.addCommand(createSearchCommand())
  query.addCommand(createTraceCommand())
  query.addCommand(createOrphansCommand())

  return program
}
```

```typescript
const cli = createCli()
cli.parseAsync(process.argv)
```

---

## Migration Notes

### Phase 1: Infrastructure Extraction (High Priority)

1. Create `platform/infra/architecture-persistence/` with `ArchitectureReader` and `ArchitectureWriter`
2. Create `platform/infra/file-system/file-operations.ts` wrapping fs operations
3. Create `platform/infra/cli-presentation/output-formatter.ts` from existing `output.ts`
4. Create `platform/infra/error-handling/error-boundary.ts` for centralized error handling

### Phase 2: Value Objects (Medium Priority)

1. Create value objects in `platform/domain/value-objects/`
2. Create architectural classification types in `platform/domain/architectural-classification/`
3. Update feature code to use value objects instead of primitives

### Phase 3: Domain Restructure (Medium Priority)

1. Create `Architecture` aggregate root in `features/author-architecture/domain/`
2. Create typed component classes in `features/author-architecture/domain/components/`
3. Move business logic from command handlers into domain objects

### Phase 4: Feature Restructure (Lower Priority)

1. Rename `commands/builder/` to `features/author-architecture/`
2. Rename `commands/extract/` to `features/extract-architecture/`
3. Rename `commands/query/` to `features/explore-architecture/`
4. Split each command file into entrypoint + use-case
5. Move root-level files to appropriate locations
