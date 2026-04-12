---
pageClass: reference
---

# Connection Config Reference

Reference for connection detection options in Extraction Config.

## Overview

| Option                             | Description                                                           |
| ---------------------------------- | --------------------------------------------------------------------- |
| `connections.patterns`             | Global `ConnectionPattern` list inherited by all modules              |
| `connections.eventPublishers`      | Event publisher declarations for convention-based async Links         |
| `module.connections.patterns`      | Module-level `ConnectionPattern` list (additive with global patterns) |
| `ConnectionPattern.name`           | Pattern identifier                                                    |
| `ConnectionPattern.find`           | Connection finder (`methodCalls`)                                     |
| `ConnectionPattern.where`          | Method call match conditions                                          |
| `ConnectionPattern.extract`        | Connection metadata extraction rules                                  |
| `ConnectionPattern.linkType`       | Link type (`sync` or `async`)                                         |
| `where.methodName`                 | Match method calls by method name                                     |
| `where.receiverType`               | Match method calls by receiver type                                   |
| `where.callerHasDecorator`         | Match calls where caller class has specific decorators                |
| `where.calleeType.hasDecorator`    | Match calls where callee type class has a decorator                   |
| `extract.<field>.fromArgument`     | Extract static type name of argument at index                         |
| `extract.<field>.fromReceiverType` | Extract receiver static type name                                     |
| `extract.<field>.fromCallerType`   | Extract caller class type name                                        |

---

### `connections.patterns`

Global connection patterns inherited by all modules.

Example:

```yaml
connections:
  patterns:
    - name: custom-event-emitter
      find: methodCalls
      where:
        methodName: emit
        receiverType: EventBus
      extract:
        eventName: { fromArgument: 0 }
      linkType: async
```

**Parameters:**

| Field                  | Type                  | Required | Description                                                        |
| ---------------------- | --------------------- | -------- | ------------------------------------------------------------------ |
| `connections.patterns` | `ConnectionPattern[]` | No       | Global pattern list. Each module runs these patterns in its scope. |

---

### `connections.eventPublishers`

Declares custom component types that publish Events using metadata.

**Parameters:**

| Field                                       | Type     | Required | Description                                              |
| ------------------------------------------- | -------- | -------- | -------------------------------------------------------- |
| `connections.eventPublishers[].fromType`    | `string` | **Yes**  | Custom component type name (must exist in `customTypes`) |
| `connections.eventPublishers[].metadataKey` | `string` | **Yes**  | Metadata key containing the published Event type name    |

**ecommerce-demo-app example:**

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

[View config in ecommerce-demo-app →](https://github.com/NTCoding/ecommerce-demo-app/blob/main/.riviere/config/extraction.config.json)

---

### `module.connections.patterns`

Module-level connection patterns. These are additive with global `connections.patterns`.

**Parameters:**

| Field                         | Type                  | Required | Description                                                      |
| ----------------------------- | --------------------- | -------- | ---------------------------------------------------------------- |
| `module.connections.patterns` | `ConnectionPattern[]` | No       | Module-specific patterns that run in addition to global patterns |

---

### `ConnectionPattern`

A single configurable connection detection rule.

**Parameters:**

| Field      | Type                  | Required | Description                              |
| ---------- | --------------------- | -------- | ---------------------------------------- |
| `name`     | `string`              | **Yes**  | Pattern identifier                       |
| `find`     | `"methodCalls"`       | **Yes**  | Connection finder                        |
| `where`    | `object`              | **Yes**  | Match clause for method calls            |
| `extract`  | `object`              | No       | Extraction rules for connection metadata |
| `linkType` | `"sync"` \| `"async"` | **Yes**  | Link type for matches                    |

**Common framework examples:**

NestJS controller to service:

```yaml
connections:
  patterns:
    - name: nestjs-controller-to-service
      find: methodCalls
      where:
        callerHasDecorator: [Controller]
        calleeType: { hasDecorator: Injectable }
      linkType: sync
```

Express route handler to service:

```yaml
connections:
  patterns:
    - name: express-route-to-usecase
      find: methodCalls
      where:
        methodName: post
        receiverType: OrderService
      linkType: sync
```

Custom event emitter:

```yaml
connections:
  patterns:
    - name: custom-event-emitter
      find: methodCalls
      where:
        methodName: emit
        receiverType: EventBus
      extract:
        eventName: { fromArgument: 0 }
      linkType: async
```

---

### `where.methodName`

Matches calls by method name.

**Parameters:**

| Field              | Type     | Required | Description                                          |
| ------------------ | -------- | -------- | ---------------------------------------------------- |
| `where.methodName` | `string` | No       | Method name to match (for example `publish`, `emit`) |

---

### `where.receiverType`

Matches calls by receiver static type name.

**Parameters:**

| Field                | Type     | Required | Description                                                     |
| -------------------- | -------- | -------- | --------------------------------------------------------------- |
| `where.receiverType` | `string` | No       | Receiver type to match (for example `EventBus`, `OrderService`) |

---

### `where.callerHasDecorator`

Matches calls when the caller class has one of the listed decorators.

**Parameters:**

| Field                      | Type       | Required | Description                                  |
| -------------------------- | ---------- | -------- | -------------------------------------------- |
| `where.callerHasDecorator` | `string[]` | No       | Decorator names to match on the caller class |

Decorator matching is name-only.

---

### `where.calleeType.hasDecorator`

Matches calls when the callee type class has a specific decorator.

**Parameters:**

| Field                           | Type     | Required | Description                                 |
| ------------------------------- | -------- | -------- | ------------------------------------------- |
| `where.calleeType.hasDecorator` | `string` | No       | Decorator name required on the callee class |

Decorator matching is name-only.

---

### `extract.<field>.fromArgument`

Extracts the static type name of an argument at the given index.

**Parameters:**

| Field                          | Type      | Required | Description               |
| ------------------------------ | --------- | -------- | ------------------------- |
| `extract.<field>.fromArgument` | `integer` | **Yes**  | Zero-based argument index |

---

### `extract.<field>.fromReceiverType`

Extracts the static type name of the receiver object.

**Parameters:**

| Field                              | Type   | Required | Description                |
| ---------------------------------- | ------ | -------- | -------------------------- |
| `extract.<field>.fromReceiverType` | `true` | **Yes**  | Extract receiver type name |

---

### `extract.<field>.fromCallerType`

Extracts the caller class type name.

**Parameters:**

| Field                            | Type   | Required | Description                    |
| -------------------------------- | ------ | -------- | ------------------------------ |
| `extract.<field>.fromCallerType` | `true` | **Yes**  | Extract caller class type name |

---

## See Also

- [Extraction Config](/reference/extraction-config/schema) — Full schema, including connection-related definitions
- [TypeScript Extraction Examples](/reference/extraction-config/examples) — Additional config examples
- [Predicate Reference](/reference/extraction-config/predicates) — Predicate options used by component detection
- [Step 4: Link](/extract/deterministic/typescript/workflow/step-4-link) — Connection workflow step
