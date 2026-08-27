# riviere-extract-conventions

Decorators for marking architectural components in TypeScript code.

The `description` in [package.json](package.json) is the source of truth for this
subdomain's purpose. See the generated
[domain guide](../../../docs/architecture/ddd/domain-guide.md) for its place in
the current domain landscape.

## Installation

```bash
npm install @living-architecture/riviere-extract-conventions-published-language
```

## Usage

```typescript
import {
  APIContainer,
  APIEndpoint,
  UseCase,
  Event,
  DomainOp,
  Ignore,
} from '@living-architecture/riviere-extract-conventions-published-language'

// Container decorator - all public methods are API endpoints
@APIContainer
class OrderController {
  @APIEndpoint
  getOrders(): Order[] { /* ... */ }

  @Ignore
  healthCheck(): boolean { return true }
}

// Class-as-component
@UseCase
class CreateOrderUseCase {
  execute(command: CreateOrderCommand): Order { /* ... */ }
}

@Event
class OrderCreated {
  constructor(readonly orderId: string) {}
}
```

## Decorators

| Decorator | Target | Description |
|-----------|--------|-------------|
| `@DomainOpContainer` | Class | All public methods are domain operations |
| `@APIContainer` | Class | All public methods are API endpoints |
| `@EventHandlerContainer` | Class | All public methods are event handlers |
| `@UseCase` | Class | Class is a use case |
| `@Event` | Class | Class is a domain event |
| `@UI` | Class | Class is a UI component |
| `@DomainOp` | Method | Method is a domain operation |
| `@APIEndpoint` | Method | Method is an API endpoint |
| `@EventHandler` | Method | Method is an event handler |
| `@Custom(type)` | Class/Method | Custom component type |
| `@Ignore` | Class/Method | Exclude from analysis |

## Building

```bash
nx build riviere-extract-conventions-published-language
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Package principles and design decisions
