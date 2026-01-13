# TypeScript Decorators

Annotate TypeScript code with architectural component markers.

## Installation

```bash
npm install --save-dev @living-architecture/riviere-extract-conventions
```

## Decorator Categories

| Category | Decorators | Usage |
|----------|-----------|-------|
| **Container** | `@APIContainer`, `@DomainOpContainer`, `@EventHandlerContainer` | Class-level: all public methods inherit component type |
| **Class-as-Component** | `@UseCase`, `@Event`, `@UI` | Class itself is the component |
| **Method-level** | `@APIEndpoint`, `@DomainOp`, `@EventHandler` | Individual methods as components |
| **Other** | `@Custom(type)`, `@Ignore` | Custom types and exclusions |

## Container Decorators

All public methods in the class become separate components.

### @APIContainer

```typescript
import { APIContainer, APIEndpoint } from '@living-architecture/riviere-extract-conventions'

@APIContainer
class OrderController {
  @APIEndpoint
  async createOrder(req: Request): Promise<Order> {
    // Extracted as: api component "createOrder"
  }

  @APIEndpoint
  async getOrder(id: string): Promise<Order> {
    // Extracted as: api component "getOrder"
  }
}
```

### @DomainOpContainer

```typescript
import { DomainOpContainer, DomainOp } from '@living-architecture/riviere-extract-conventions'

@DomainOpContainer
class Order {
  @DomainOp
  begin(): void {
    // Extracted as: domainOp component "begin"
  }

  @DomainOp
  complete(): void {
    // Extracted as: domainOp component "complete"
  }
}
```

### @EventHandlerContainer

```typescript
import { EventHandlerContainer, EventHandler } from '@living-architecture/riviere-extract-conventions'

@EventHandlerContainer
class OrderEventHandlers {
  @EventHandler
  async onOrderPlaced(event: OrderPlaced): Promise<void> {
    // Extracted as: eventHandler component "onOrderPlaced"
  }
}
```

## Class-as-Component Decorators

The class itself is the architectural component.

### @UseCase

```typescript
import { UseCase } from '@living-architecture/riviere-extract-conventions'

@UseCase
class PlaceOrderUseCase {
  execute(command: PlaceOrderCommand): Order {
    // Class extracted as: useCase component "PlaceOrderUseCase"
  }
}
```

### @Event

```typescript
import { Event } from '@living-architecture/riviere-extract-conventions'

@Event
class OrderPlaced {
  constructor(
    public readonly orderId: string,
    public readonly timestamp: Date
  ) {}
  // Class extracted as: event component "OrderPlaced"
}
```

### @UI

```typescript
import { UI } from '@living-architecture/riviere-extract-conventions'

@UI
class OrderList {
  render(): HTMLElement {
    // Class extracted as: ui component "OrderList"
  }
}
```

## Method-Level Decorators

Individual methods marked as components (without container decorator on class).

### @APIEndpoint

```typescript
import { APIEndpoint } from '@living-architecture/riviere-extract-conventions'

class OrderController {
  @APIEndpoint
  async createOrder(req: Request): Promise<Order> {
    // Extracted as: api component "createOrder"
  }

  // Other methods NOT extracted (no decorator)
  private validateOrder(order: Order): boolean {
    return true
  }
}
```

### @DomainOp

```typescript
import { DomainOp } from '@living-architecture/riviere-extract-conventions'

class Order {
  @DomainOp
  begin(): void {
    // Extracted as: domainOp component "begin"
  }

  // Other methods NOT extracted
  private calculateTotal(): number {
    return 0
  }
}
```

### @EventHandler

```typescript
import { EventHandler } from '@living-architecture/riviere-extract-conventions'

class OrderHandlers {
  @EventHandler
  async onOrderPlaced(event: OrderPlaced): Promise<void> {
    // Extracted as: eventHandler component "onOrderPlaced"
  }
}
```

## Other Decorators

### @Custom(type)

Define custom component types:

```typescript
import { Custom } from '@living-architecture/riviere-extract-conventions'

@Custom('saga')
class OrderSaga {
  // Extracted as: custom component type "saga"
}
```

### @Ignore

Exclude classes from extraction:

```typescript
import { Ignore } from '@living-architecture/riviere-extract-conventions'

@Ignore
class TestHelper {
  // Not extracted
}
```

## When to Use Which

| Scenario | Decorator |
|----------|-----------|
| REST controller with multiple endpoints | `@APIContainer` on class |
| Domain entity with multiple operations | `@DomainOpContainer` on class |
| Event handler class with multiple handlers | `@EventHandlerContainer` on class |
| Single-purpose use case class | `@UseCase` on class |
| Domain event class | `@Event` on class |
| UI component class | `@UI` on class |
| Mixed class (some methods are components, others aren't) | Method-level decorators |
| Test/utility class | `@Ignore` on class |
| Custom component type | `@Custom('type')` on class |

## Default Config

The conventions package provides a default config that detects all decorator types across all TypeScript files:

```bash
npx riviere extract \
  --config node_modules/@living-architecture/riviere-extract-conventions/src/default-extraction.config.json
```

[View Default Config Source](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-extract-conventions/src/default-extraction.config.json)

## Enforcement

Ensure all classes have component decorators using ESLint:

[Enforcement Guide →](/extract/deterministic/typescript/enforcement)

## See Also

- [Getting Started](/extract/deterministic/typescript/getting-started) — 10-minute tutorial
- [Examples](/reference/extraction-config/examples) — Real-world configs
- [Config Reference](/reference/extraction-config/schema) — Complete DSL
