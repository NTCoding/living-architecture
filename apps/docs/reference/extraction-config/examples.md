# TypeScript Extraction Examples

Real-world extraction configs for different architectural patterns.

## Demo Application

See a working example in the ecommerce demo app:

[View ecommerce-demo-app →](https://github.com/NTCoding/ecommerce-demo-app)

## NestJS Project

Use NestJS decorators for API detection:

```yaml
modules:
  - name: "orders"
    path: "src/orders/**/*.ts"
    api:
      find: "methods"
      where:
        and:
          - hasDecorator:
              name: ["Get", "Post", "Put", "Delete", "Patch"]
              from: "@nestjs/common"
          - inClassWith:
              hasDecorator:
                name: "Controller"
                from: "@nestjs/common"
    useCase:
      find: "classes"
      where:
        hasDecorator:
          name: "Injectable"
          from: "@nestjs/common"
    domainOp: { notUsed: true }
    event: { notUsed: true }
    eventHandler: { notUsed: true }
    ui: { notUsed: true }
```

**Code example:**

```typescript
import { Controller, Get, Post } from '@nestjs/common'
import { Injectable } from '@nestjs/common'

@Controller('orders')
class OrderController {
  @Get()
  findAll() {
    // Extracted as: api "findAll"
  }

  @Post()
  create() {
    // Extracted as: api "create"
  }
}

@Injectable()
class CreateOrderService {
  // Extracted as: useCase "CreateOrderService"
}
```

## Domain-Driven Design

Use inheritance for events and naming for operations:

```yaml
modules:
  - name: "orders"
    path: "src/domain/orders/**/*.ts"
    api: { notUsed: true }
    useCase:
      find: "classes"
      where:
        nameEndsWith:
          suffix: "UseCase"
    domainOp:
      find: "methods"
      where:
        inClassWith:
          nameEndsWith:
            suffix: "Entity"
    event:
      find: "classes"
      where:
        extendsClass:
          name: "DomainEvent"
    eventHandler:
      find: "methods"
      where:
        hasDecorator:
          name: "EventHandler"
    ui: { notUsed: true }
```

**Code example:**

```typescript
abstract class DomainEvent {
  readonly occurredAt: Date = new Date()
}

class OrderPlaced extends DomainEvent {
  // Extracted as: event "OrderPlaced"
}

class OrderEntity {
  begin(): void {
    // Extracted as: domainOp "begin"
  }
}

class PlaceOrderUseCase {
  // Extracted as: useCase "PlaceOrderUseCase"
}
```

## JSDoc-Based Project

Use JSDoc tags for teams avoiding decorators:

```yaml
modules:
  - name: "orders"
    path: "src/orders/**/*.ts"
    api:
      find: "methods"
      where:
        hasJSDoc:
          tag: "api"
    useCase:
      find: "functions"
      where:
        hasJSDoc:
          tag: "usecase"
    domainOp:
      find: "methods"
      where:
        hasJSDoc:
          tag: "domainop"
    event:
      find: "classes"
      where:
        hasJSDoc:
          tag: "event"
    eventHandler:
      find: "functions"
      where:
        hasJSDoc:
          tag: "handler"
    ui: { notUsed: true }
```

**Code example:**

```typescript
class OrderController {
  /**
   * @api
   */
  async createOrder(req: Request): Promise<Order> {
    // Extracted as: api "createOrder"
  }
}

/**
 * @usecase
 */
function placeOrder(command: PlaceOrderCommand): Order {
  // Extracted as: useCase "placeOrder"
}

/**
 * @event
 */
class OrderPlaced {
  // Extracted as: event "OrderPlaced"
}
```

## Naming Convention Project

Use naming patterns without decorators:

```yaml
modules:
  - name: "orders"
    path: "src/orders/**/*.ts"
    api:
      find: "methods"
      where:
        inClassWith:
          nameEndsWith:
            suffix: "Controller"
    useCase:
      find: "classes"
      where:
        nameEndsWith:
          suffix: "UseCase"
    domainOp:
      find: "methods"
      where:
        inClassWith:
          # Example pattern - adjust to match your entity class names
          nameMatches:
            pattern: "^(Order|Product|Customer)$"
    event:
      find: "classes"
      where:
        nameMatches:
          pattern: "^.*Event$"
    eventHandler:
      find: "methods"
      where:
        nameMatches:
          pattern: "^on[A-Z].*"
    ui: { notUsed: true }
```

**Code example:**

```typescript
class OrderController {
  createOrder(): Order {
    // Extracted as: api "createOrder"
  }
}

class PlaceOrderUseCase {
  // Extracted as: useCase "PlaceOrderUseCase"
}

class OrderEntity {
  begin(): void {
    // Extracted as: domainOp "begin"
  }
}

class OrderPlacedEvent {
  // Extracted as: event "OrderPlacedEvent"
}

class Handlers {
  onOrderPlaced(event: OrderPlacedEvent): void {
    // Extracted as: eventHandler "onOrderPlaced"
  }
}
```

## Multi-Module Project

Different strategies per domain:

```yaml
modules:
  # Orders: using our decorators
  - name: "orders"
    path: "src/orders/**/*.ts"
    api:
      find: "methods"
      where:
        inClassWith:
          hasDecorator:
            name: "APIContainer"
            from: "@living-architecture/riviere-extract-conventions"
    useCase:
      find: "classes"
      where:
        hasDecorator:
          name: "UseCase"
          from: "@living-architecture/riviere-extract-conventions"
    domainOp: { notUsed: true }
    event: { notUsed: true }
    eventHandler: { notUsed: true }
    ui: { notUsed: true }

  # Shipping: using NestJS decorators
  - name: "shipping"
    path: "src/shipping/**/*.ts"
    api:
      find: "methods"
      where:
        hasDecorator:
          name: ["Get", "Post"]
          from: "@nestjs/common"
    useCase:
      find: "classes"
      where:
        hasDecorator:
          name: "Injectable"
          from: "@nestjs/common"
    domainOp: { notUsed: true }
    event: { notUsed: true }
    eventHandler: { notUsed: true }
    ui: { notUsed: true }

  # Inventory: using naming conventions
  - name: "inventory"
    path: "src/inventory/**/*.ts"
    api:
      find: "methods"
      where:
        inClassWith:
          nameEndsWith:
            suffix: "Controller"
    useCase:
      find: "classes"
      where:
        nameEndsWith:
          suffix: "Service"
    domainOp: { notUsed: true }
    event: { notUsed: true }
    eventHandler: { notUsed: true }
    ui: { notUsed: true }

  # Payments: using JSDoc
  - name: "payments"
    path: "src/payments/**/*.ts"
    api:
      find: "methods"
      where:
        hasJSDoc:
          tag: "api"
    useCase:
      find: "functions"
      where:
        hasJSDoc:
          tag: "usecase"
    domainOp: { notUsed: true }
    event: { notUsed: true }
    eventHandler: { notUsed: true }
    ui: { notUsed: true }
```

## Multi-Module with Extends

Use `extends` for consistent decorator-based detection across modules with minimal config:

```yaml
modules:
  # All modules inherit detection rules from the conventions package
  - name: "orders"
    path: "src/orders/**/*.ts"
    extends: "@living-architecture/riviere-extract-conventions"

  - name: "shipping"
    path: "src/shipping/**/*.ts"
    extends: "@living-architecture/riviere-extract-conventions"

  - name: "inventory"
    path: "src/inventory/**/*.ts"
    extends: "@living-architecture/riviere-extract-conventions"

  # Override specific rules when needed
  - name: "payments"
    path: "src/payments/**/*.ts"
    extends: "@living-architecture/riviere-extract-conventions"
    event: { notUsed: true }  # No events in payments module
    ui: { notUsed: true }      # No UI in payments module
```

**Benefits:**
- Minimal boilerplate — just name, path, and extends
- Consistent detection rules across all modules
- Selective overrides where needed
- Easy to add new modules

## See Also

- [Config Reference](/reference/extraction-config/schema) — Complete DSL specification
- [Predicate Reference](/reference/extraction-config/predicates) — All 9 predicates
- [Getting Started](/extract/deterministic/typescript/getting-started) — Setup tutorial
- [Decorators Reference](/reference/extraction-config/decorators) — All 11 decorators
