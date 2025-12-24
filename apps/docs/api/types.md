# Types Reference

Complete type definitions for the Riviere libraries.

## Configuration Types

### RiviereBuilderConfig

```typescript
interface RiviereBuilderConfig {
  name?: string
  description?: string
  sources: SourceMetadata[]
  domains: Record<string, DomainMetadata>
  customTypes?: Record<string, CustomTypeDefinition>
}
```

### SourceMetadata

```typescript
interface SourceMetadata {
  repository: string
  commit?: string
  extractedAt?: string  // ISO timestamp, auto-set if not provided
}
```

### DomainMetadata

```typescript
interface DomainMetadata {
  description: string
  systemType: SystemType
}
```

### SystemType

```typescript
type SystemType = 'domain' | 'bff' | 'ui' | 'other'
```

### CustomTypeDefinition

```typescript
interface CustomTypeDefinition {
  requiredFields: string[]
  optionalFields?: string[]
}
```

---

## State Transition

### StateTransition

Used by DomainOp components to describe state changes:

```typescript
interface StateTransition {
  from: string
  to: string
  trigger?: string
}
```

---

## Source Location

### SourceLocation

```typescript
interface SourceLocation {
  repository: string
  filePath: string
  lineNumber?: number
  endLineNumber?: number
  methodName?: string
  url?: string
}
```

---

## Component Types

### ComponentType

```typescript
type ComponentType = 'UI' | 'API' | 'UseCase' | 'DomainOp' | 'Event' | 'EventHandler' | 'Custom'
```

### Component (Union)

```typescript
type Component =
  | UI
  | API
  | UseCase
  | DomainOp
  | Event
  | EventHandler
  | Custom
```

### BaseComponent

All components extend this base:

```typescript
interface BaseComponent {
  id: string
  type: ComponentType
  name: string
  domain: string
  module: string
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
}
```

### UI

```typescript
interface UI extends BaseComponent {
  type: 'UI'
  route: string
}
```

### API

```typescript
interface API extends BaseComponent {
  type: 'API'
  apiType: ApiType
  httpMethod?: HttpMethod      // Present for REST
  path?: string                // Present for REST
  operationName?: string       // Present for GraphQL
}
```

### HttpMethod

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
```

### ApiType

```typescript
type ApiType = 'REST' | 'GraphQL' | 'other'
```

### UseCase

```typescript
interface UseCase extends BaseComponent {
  type: 'UseCase'
}
```

### DomainOp

```typescript
interface DomainOp extends BaseComponent {
  type: 'DomainOp'
  operationName: string
  entity?: string
  stateChanges?: StateTransition[]
  businessRules?: string[]
}
```

### Event

```typescript
interface Event extends BaseComponent {
  type: 'Event'
  eventName: string
  eventSchema?: string
}
```

### EventHandler

```typescript
interface EventHandler extends BaseComponent {
  type: 'EventHandler'
  subscribedEvents: string[]
}
```

### Custom

```typescript
interface Custom extends BaseComponent {
  type: 'Custom'
}
```

---

## Input Types

### AddUIInput

```typescript
interface AddUIInput {
  domain: string
  module: string
  name: string
  route: string
  sourceLocation: SourceLocation
  description?: string
  metadata?: Record<string, unknown>
}
```

### AddAPIInput

```typescript
interface AddAPIInput {
  domain: string
  module: string
  apiType?: ApiType             // Defaults to 'REST'
  httpMethod: HttpMethod
  path: string
  sourceLocation: SourceLocation
  description?: string
  metadata?: Record<string, unknown>
}
```

### AddGraphQLAPIInput

```typescript
interface AddGraphQLAPIInput {
  domain: string
  module: string
  apiType: 'GraphQL'
  operationName: string
  sourceLocation: SourceLocation
  description?: string
  metadata?: Record<string, unknown>
}
```

### AddUseCaseInput

```typescript
interface AddUseCaseInput {
  domain: string
  module: string
  name: string
  sourceLocation: SourceLocation
  description?: string
  metadata?: Record<string, unknown>
}
```

### AddDomainOpInput

```typescript
interface AddDomainOpInput {
  domain: string
  module: string
  entity?: string
  operationName: string
  stateChanges?: StateTransition[]
  businessRules?: string[]
  sourceLocation: SourceLocation
  description?: string
  metadata?: Record<string, unknown>
}
```

### AddEventInput

```typescript
interface AddEventInput {
  domain: string
  module: string
  eventName: string
  sourceLocation: SourceLocation
  description?: string
  eventSchema?: string
  metadata?: Record<string, unknown>
}
```

### AddEventHandlerInput

```typescript
interface AddEventHandlerInput {
  domain: string
  module: string
  name: string
  subscribedEvents: string[]
  sourceLocation: SourceLocation
  description?: string
  metadata?: Record<string, unknown>
}
```

### AddCustomInput

```typescript
interface AddCustomInput {
  domain: string
  module: string
  customType: string
  name: string
  sourceLocation: SourceLocation
  description?: string
  metadata?: Record<string, unknown>
  [key: string]: unknown         // Custom type-specific fields
}
```

---

## Link Types

### LinkType

```typescript
type LinkType = 'sync' | 'async'
```

### Link

```typescript
interface Link {
  id: string
  source: string
  target: string
  type: LinkType
  sourceLocation?: SourceLocation
}
```

---

## External Link Types

Types for linking to systems outside the current graph.

### ExternalTarget

```typescript
interface ExternalTarget {
  name: string        // External system name (required)
  domain?: string     // Domain name if known
  repository?: string // Repository name if known
  url?: string        // External system URL
}
```

### ExternalLink

```typescript
interface ExternalLink {
  id: string
  source: string
  target: ExternalTarget
  type: LinkType
  description?: string
  sourceLocation?: SourceLocation
}
```

---

## Lookup Types

### ComponentLookupCriteria

```typescript
interface ComponentLookupCriteria {
  type?: ComponentType
  name?: string
  domain?: string
  module?: string
  eventName?: string
  route?: string
  path?: string
  httpMethod?: HttpMethod
  operationName?: string
  sourceLocation?: {
    filePath: string
    lineNumber?: number
  }
}
```

### NearMatchResult

```typescript
interface NearMatchResult {
  component: Component
  reason: string
}
```

---

## Output Types

### RiviereGraph

```typescript
interface RiviereGraph {
  version: string
  metadata: {
    name?: string
    description?: string
    generated: string
    sources: SourceMetadata[]
    domains: Record<string, DomainMetadata>
  }
  components: Component[]
  links: Link[]
  externalLinks?: ExternalLink[]
}
```

### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean
  errors: string[]
}
```

### BuilderStats

```typescript
interface BuilderStats {
  components: number
  links: number
  warnings: number
}
```

---

## Query Types

Types returned by RiviereQuery methods.

### Domain

```typescript
interface Domain {
  name: string
  description: string
  systemType: 'domain' | 'bff' | 'ui' | 'other'
  componentCounts: {
    UI: number
    API: number
    UseCase: number
    DomainOp: number
    Event: number
    EventHandler: number
    Custom: number
    total: number
  }
}
```

### Entity

```typescript
interface Entity {
  name: string
  domain: string
  operations: DomainOp[]
}
```

### CrossDomainLink

```typescript
interface CrossDomainLink {
  targetDomain: string
  linkType: 'sync' | 'async'
}
```

### FlowResult

```typescript
interface FlowResult {
  nodeIds: string[]
  linkIds: string[]
}
```

### PublishedEvent

```typescript
interface PublishedEvent {
  id: string
  eventName: string
  domain: string
  handlers: EventSubscriber[]
}
```

### EventSubscriber

```typescript
interface EventSubscriber {
  domain: string
  handlerName: string
}
```

### EventHandlerInfo

```typescript
interface EventHandlerInfo {
  id: string
  handlerName: string
  domain: string
  subscribedEvents: string[]
  subscribedEventsWithDomain: Array<{
    eventName: string
    sourceDomain: string | undefined
  }>
}
```

### DomainConnection

```typescript
interface DomainConnection {
  targetDomain: string
  direction: 'incoming' | 'outgoing'
  apiCount: number
  eventCount: number
}
```

### FlowStep

```typescript
interface FlowStep {
  component: Component
  linkType: 'sync' | 'async' | undefined
  depth: number
}
```

### Flow

```typescript
interface Flow {
  entryPoint: Component
  steps: FlowStep[]
}
```

---

## Enrichment Types

Types for enriching components after creation.

### ComponentEnrichment

```typescript
type ComponentEnrichment = DomainOpEnrichment
```

### DomainOpEnrichment

```typescript
interface DomainOpEnrichment {
  type: 'DomainOp'
  stateChanges?: StateTransition[]
  businessRules?: string[]
}
```

### EntityTransition

```typescript
interface EntityTransition {
  from: string
  to: string
  triggeredBy: string
}
```
