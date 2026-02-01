---
pageClass: reference
---

# Extraction Rules

Rules that extract metadata values from matched components. Each rule specifies **where** to read a value from the source code.

Extraction rules are defined in the `extract` block of a [detection rule](/reference/extraction-config/schema#detectionRule):

```yaml
api:
  find: "methods"
  where:
    inClassWith:
      hasDecorator: { name: "Controller" }
  extract:
    apiType: { literal: "REST" }
    httpMethod: { fromDecoratorName: true }
    path: { fromDecoratorArg: { position: 0 } }
```

---

## Required Fields by Component Type

Some component types require specific metadata fields. Extraction fails if required fields have no extraction rule.

| Component Type | Required Fields |
|---------------|-----------------|
| `api` | `apiType` |
| `event` | `eventName` |
| `eventHandler` | `subscribedEvents` |
| `domainOp` | `operationName` |
| `ui` | `route` |
| `useCase` | *(none)* |

Use `--allow-incomplete` to emit components with missing fields instead of failing.

---

## literal

Hardcoded value. Use when every matched component shares the same value.

**Parameters:**

| Field | Type | Required |
|-------|------|----------|
| `literal` | `string` \| `boolean` \| `number` | **Yes** |

**YAML:**

```yaml
extract:
  apiType: { literal: "REST" }
  isPublic: { literal: true }
  priority: { literal: 1 }
```

**TypeScript — what gets extracted:**

```typescript
@APIContainer
class OrderController {
  // Every method extracts apiType: "REST"
  createOrder() {}
  getOrder() {}
}
```

**Edge cases:** Accepts `string`, `boolean`, or `number`. Use `string` for most metadata fields. Boolean/number values are serialized as-is in the output.

---

## fromClassName

Extracts the class name, optionally with a [transform](#transforms).

**Parameters:**

| Field | Type | Required |
|-------|------|----------|
| `fromClassName` | `true` \| `{ transform?: Transform }` | **Yes** |

**YAML:**

```yaml
# Simple — use class name as-is
extract:
  eventName: { fromClassName: true }

# With transform — strip suffix
extract:
  eventName:
    fromClassName:
      transform: { stripSuffix: "Event" }
```

**TypeScript:**

```typescript
@Event
class OrderPlacedEvent {
  // fromClassName: true          → "OrderPlacedEvent"
  // stripSuffix: "Event"        → "OrderPlaced"
}
```

**Edge cases:** For method-level finds (`find: "methods"`), extracts the **enclosing class name**, not the method name. Anonymous/default-exported classes produce an empty string.

---

## fromMethodName

Extracts the method name, optionally with a [transform](#transforms).

**Parameters:**

| Field | Type | Required |
|-------|------|----------|
| `fromMethodName` | `true` \| `{ transform?: Transform }` | **Yes** |

**YAML:**

```yaml
# Simple
extract:
  operationName: { fromMethodName: true }

# With transform
extract:
  operationName:
    fromMethodName:
      transform: { pascalToKebab: true }
```

**TypeScript:**

```typescript
@DomainOpContainer
class Order {
  begin() {}
  // fromMethodName: true    → "begin"

  CompleteOrder() {}
  // pascalToKebab: true     → "complete-order"
}
```

**Edge cases:** Only works with `find: "methods"` or `find: "functions"`. Using with `find: "classes"` produces an empty string since classes don't have method names.

---

## fromFilePath

Extracts a value from the file path using a regex capture group.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromFilePath.pattern` | `string` | **Yes** | Regex pattern with capture groups |
| `fromFilePath.capture` | `integer` | **Yes** | Capture group index (0 = full match) |
| `fromFilePath.transform` | `Transform` | No | Transform to apply |

**YAML:**

```yaml
extract:
  route:
    fromFilePath:
      pattern: "pages/(.*)\\.tsx?"
      capture: 1
      transform: { toLowerCase: true }
```

**TypeScript:**

```typescript
// File: src/pages/OrderList.tsx
@UI
class OrderList {
  // pattern "pages/(.*)\\.tsx?" captures "OrderList"
  // capture: 1 → "OrderList"
  // toLowerCase → "orderlist"
}
```

**Edge cases:** Pattern is matched against the full file path. If no capture group matches, extraction produces an empty string. Use `capture: 0` for the full regex match. Escape backslashes in YAML strings.

---

## fromProperty

Extracts a value from a class property (static or instance).

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromProperty.name` | `string` | **Yes** | Property name |
| `fromProperty.kind` | `"static"` \| `"instance"` | **Yes** | Property kind |
| `fromProperty.transform` | `Transform` | No | Transform to apply |

**YAML:**

```yaml
extract:
  route:
    fromProperty:
      name: "route"
      kind: "static"

  httpMethod:
    fromProperty:
      name: "method"
      kind: "static"
      transform: { toUpperCase: true }
```

**TypeScript:**

```typescript
@UI
class OrderListPage implements UIPageDef {
  static readonly route = '/orders'
  // fromProperty name:"route" kind:"static" → "/orders"

  static readonly method = 'get'
  // toUpperCase → "GET"
}
```

**Edge cases:** Property must exist and have a string literal initializer. Computed properties, non-literal expressions, and missing properties produce empty strings. For `kind: "instance"`, the property must be initialized in the class body (not the constructor).

---

## fromDecoratorArg

Extracts a value from a decorator's argument.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromDecoratorArg.position` | `integer` | No | Argument index (0-based) |
| `fromDecoratorArg.name` | `string` | No | Named argument key |
| `fromDecoratorArg.transform` | `Transform` | No | Transform to apply |

At least one of `position` or `name` is required.

**YAML:**

```yaml
# By position
extract:
  path:
    fromDecoratorArg:
      position: 0

# By name (for object arguments)
extract:
  path:
    fromDecoratorArg:
      name: "path"
```

**TypeScript:**

```typescript
// By position
@Controller('/orders')
class OrderController {
  // fromDecoratorArg position:0 → "/orders"

  @Get('/list')
  listOrders() {
    // fromDecoratorArg position:0 → "/list"
  }
}

// By name (object argument)
@Route({ path: '/orders', method: 'GET' })
class OrderRoute {
  // fromDecoratorArg name:"path" → "/orders"
}
```

**Edge cases:** Only reads string literal arguments. Template literals, variables, and expressions produce empty strings. When both `position` and `name` are provided, `name` takes precedence. Decorators without arguments produce empty strings.

---

## fromDecoratorName

Extracts the decorator's own name as the value. Useful when different decorators map to different metadata values.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromDecoratorName` | `true` \| `{ mapping?: Record<string, string>, transform?: Transform }` | **Yes** | Use the decorator name as the extracted value |

**YAML:**

```yaml
# Direct — decorator name is the value
extract:
  httpMethod: { fromDecoratorName: true }

# With mapping — translate decorator names
extract:
  httpMethod:
    fromDecoratorName:
      mapping:
        Get: "GET"
        Post: "POST"
        Put: "PUT"
        Delete: "DELETE"
```

**TypeScript:**

```typescript
@Controller('/orders')
class OrderController {
  @Get('/list')
  listOrders() {
    // fromDecoratorName: true       → "Get"
    // mapping { Get: "GET" }        → "GET"
  }

  @Post()
  createOrder() {
    // fromDecoratorName: true       → "Post"
    // mapping { Post: "POST" }      → "POST"
  }
}
```

**Edge cases:** When using `mapping`, decorator names not in the map produce empty strings. For method-level components, reads the method's own decorator, not the class decorator. Multiple decorators: uses the first matching one from the detection rule.

---

## fromGenericArg

Extracts the type name from a generic type argument on an interface or class.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromGenericArg.interface` | `string` | **Yes** | Interface/class name with the generic parameter |
| `fromGenericArg.position` | `integer` | **Yes** | Type argument index (0-based) |
| `fromGenericArg.transform` | `Transform` | No | Transform to apply |

**YAML:**

```yaml
extract:
  subscribedEvents:
    fromGenericArg:
      interface: "IEventHandler"
      position: 0
```

**TypeScript:**

```typescript
import { IEventHandler } from '@living-architecture/riviere-extract-conventions'

@EventHandlerContainer
class OrderHandlers implements IEventHandler<OrderPlaced> {
  // fromGenericArg interface:"IEventHandler" position:0 → "OrderPlaced"

  async handle(event: OrderPlaced) {}
}
```

**Edge cases:** The `interface` field must match exactly (case-sensitive). For classes implementing multiple interfaces, only the specified interface is checked. Unresolved or imported-as-alias type arguments may not resolve correctly.

---

## fromMethodSignature

Extracts the method's parameter names/types and return type as structured data.

**Parameters:**

| Field | Type | Required |
|-------|------|----------|
| `fromMethodSignature` | `true` | **Yes** |

**YAML:**

```yaml
extract:
  signature: { fromMethodSignature: true }
```

**TypeScript:**

```typescript
@DomainOpContainer
class Order {
  begin(orderId: string, items: OrderItem[]): OrderResult {
    // fromMethodSignature → structured data with params and return type
  }
}
```

**Edge cases:** Only works with `find: "methods"`. Return type must be explicitly annotated — inferred return types are not captured. Destructured parameters use the destructuring pattern as the name.

---

## fromConstructorParams

Extracts constructor parameter names and types as structured data.

**Parameters:**

| Field | Type | Required |
|-------|------|----------|
| `fromConstructorParams` | `true` | **Yes** |

**YAML:**

```yaml
extract:
  dependencies: { fromConstructorParams: true }
```

**TypeScript:**

```typescript
@UseCase
class PlaceOrderUseCase {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly eventBus: EventBus
  ) {}
  // fromConstructorParams → [{ name: "orderRepo", type: "OrderRepository" }, ...]
}
```

**Edge cases:** Only works with `find: "classes"`. Classes without constructors produce an empty array. Parameter decorators (e.g., `@Inject()`) are ignored — only names and types are captured.

---

## fromParameterType

Extracts the type name of a method parameter at a given position.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromParameterType.position` | `integer` | **Yes** | Parameter index (0-based) |
| `fromParameterType.transform` | `Transform` | No | Transform to apply |

**YAML:**

```yaml
extract:
  eventType:
    fromParameterType:
      position: 0
      transform: { stripSuffix: "Event" }
```

**TypeScript:**

```typescript
@EventHandlerContainer
class Handlers {
  onOrderPlaced(event: OrderPlacedEvent) {
    // fromParameterType position:0            → "OrderPlacedEvent"
    // stripSuffix: "Event"                    → "OrderPlaced"
  }
}
```

**Edge cases:** Only reads explicitly annotated type names. Union types, intersection types, and generic types return the full type text. Position out of range produces an empty string.

---

## Transforms

Transforms modify extracted string values. Multiple transforms can be combined.

::: tip Transform Order
When combining transforms, they execute in a fixed order regardless of YAML key order: `stripSuffix` → `stripPrefix` → `toLowerCase` → `toUpperCase` → `kebabToPascal` → `pascalToKebab`.
:::

| Transform | Description | Example |
|-----------|-------------|---------|
| `stripSuffix` | Remove trailing string | `"OrderEvent"` → `"Order"` |
| `stripPrefix` | Remove leading string | `"IOrder"` → `"Order"` |
| `toLowerCase` | Lowercase entire string | `"GET"` → `"get"` |
| `toUpperCase` | Uppercase entire string | `"get"` → `"GET"` |
| `kebabToPascal` | Convert kebab-case to PascalCase | `"place-order"` → `"PlaceOrder"` |
| `pascalToKebab` | Convert PascalCase to kebab-case | `"PlaceOrder"` → `"place-order"` |

**YAML — combining transforms:**

```yaml
extract:
  eventName:
    fromClassName:
      transform:
        stripSuffix: "Event"
        toLowerCase: true
```

---

## See Also

- [Config Schema](/reference/extraction-config/schema) — Full config structure
- [Predicates](/reference/extraction-config/predicates) — Detection rule filters
- [Examples](/reference/extraction-config/examples) — Real-world configs
- [Decorators](/reference/extraction-config/decorators) — Built-in component markers
