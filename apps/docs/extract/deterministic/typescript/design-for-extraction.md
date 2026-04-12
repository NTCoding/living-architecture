# Design for Extraction

Design your TypeScript code so deterministic extraction can consistently detect each Component and Link in CI.

## Why code design affects extraction accuracy

Deterministic extraction reads static types, decorators, and class/method structure from your code and your Extraction Config. When code follows a stable Convention, extraction produces repeatable results.

When code does not follow a stable Convention, extraction can miss Components or produce uncertain Links.

In the ecommerce demo app, event publishing uses explicit types and the `EventPublisherDef` interface:

```typescript
import { EventPublisherContainer } from '@living-architecture/riviere-extract-conventions'
import type { EventPublisherDef } from '@living-architecture/riviere-extract-conventions'
import { eventBus, OrderPlaced } from './events'

@EventPublisherContainer
export class OrderEventPublisher implements EventPublisherDef {
  declare readonly __brand: 'EventPublisherDef'

  publishOrderPlaced(event: OrderPlaced): void {
    eventBus.emit(event.type, event)
  }
}
```

This design gives extraction a typed Event publisher method and a typed Event argument, which improves Link detection.

[View source in ecommerce-demo-app →](https://github.com/NTCoding/ecommerce-demo-app/blob/main/orders-domain/src/infrastructure/order-event-publisher.ts)

## Golden Path conventions with examples

The Golden Path uses shared conventions so extraction can map code to Components and Links without AI.

### 1) Event classes implement `EventDef`

```typescript
import { Event } from '@living-architecture/riviere-extract-conventions'
import type { EventDef } from '@living-architecture/riviere-extract-conventions'

@Event
export class OrderPlaced implements EventDef {
  readonly type = 'OrderPlaced'
}
```

### 2) Event handlers declare subscribed events

```typescript
import { EventHandlerContainer } from '@living-architecture/riviere-extract-conventions'
import type { EventHandlerDef } from '@living-architecture/riviere-extract-conventions'

@EventHandlerContainer
export class PaymentCompletedHandler implements EventHandlerDef {
  readonly subscribedEvents = ['PaymentCompleted']
}
```

### 3) Connection config declares event publishers

The ecommerce demo app extraction config declares event publishers at the top-level `connections` key:

```json
{
  "connections": {
    "eventPublishers": [
      {
        "fromType": "eventPublisher",
        "metadataKey": "publishedEventType"
      }
    ]
  }
}
```

This works with the default conventions config where the `eventPublisher` custom type extracts `publishedEventType` from the publish method parameter type.

[View config in ecommerce-demo-app →](https://github.com/NTCoding/ecommerce-demo-app/blob/main/.riviere/config/extraction.config.json)

## Migration guide from legacy patterns

Use an incremental migration so extraction continues to work while conventions are adopted.

### Step 1: Keep current custom patterns running

If legacy code already uses custom emitters, keep a `connections.patterns` rule during migration:

```yaml
connections:
  patterns:
    - name: custom-event-publisher
      find: methodCalls
      where:
        methodName: publish
        receiverType: EventBus
      extract:
        eventName: { fromArgument: 0 }
      linkType: async
```

### Step 2: Add Event conventions to code

- Implement `EventDef` on Event classes
- Implement `EventHandlerDef` on handler classes (with `subscribedEvents`)
- Implement `EventPublisherDef` on publisher classes

### Step 3: Switch to conventions-based publisher config

After the code follows Golden Path conventions, move to top-level `connections.eventPublishers`:

```json
{
  "connections": {
    "eventPublishers": [
      {
        "fromType": "eventPublisher",
        "metadataKey": "publishedEventType"
      }
    ]
  }
}
```

### Step 4: Remove temporary custom pattern rules

Remove legacy `connections.patterns` rules that duplicate Golden Path behavior.

## See Also

- [Step 3: Extract](/extract/deterministic/typescript/workflow/step-3-extract) — Apply deterministic extraction conventions
- [Connection Config Reference](/reference/extraction-config/connections) — Connection config options and examples
- [TypeScript Decorators](/reference/extraction-config/decorators) — Component decorators used by conventions
- [Extraction Config](/reference/extraction-config/schema) — Full config schema
- [riviere-extract-conventions package docs](https://github.com/NTCoding/living-architecture/tree/main/packages/riviere-extract-conventions) — Conventions package source and usage
