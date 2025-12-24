# Error Messages

Error messages are designed to be actionable. Each error explains what's wrong, shows the problematic value, and suggests how to fix it.

## Error Message Format

```text
{What's wrong}: "{problematic value}". {How to fix it}. {Additional context}
```

## Error Categories

### Configuration Errors

**Missing sources:**
```text
At least one source is required
```

**Missing domains:**
```text
At least one domain is required
```

### Domain Errors

**Unknown domain:**
```text
Unknown domain: "shipping". Available domains: orders, inventory, billing
```

This error shows all valid domains so you can see your options.

### Name Validation Errors

**Whitespace in name:**
```text
Invalid name: "place order". Names cannot contain whitespace. Use kebab-case instead.
```

### Custom Type Errors

**Unknown custom type:**
```text
Unknown custom type: "Queue". Define it first with defineCustomType() or in builder config.
```

**Missing required field:**
```text
Custom type "Queue" requires field "queueName"
```

**Duplicate custom type:**
```text
Custom type "Queue" is already defined
```

### Entity Errors

**Entity doesn't exist (when enriching):**
```text
Entity "Invoice" does not exist in domain "orders". Use defineEntity() to create it first.
```

**Entity already exists (when defining):**
```text
Entity "Order" already exists in domain "orders". Use enrichEntity() to add details.
```

**Undefined entity definition:**
```text
Entity "Order" has undefined definition in domain "orders"
```

### Build-Time Validation Errors

**Missing link source:**
```text
Validation failed:
Link source not found: orders:api:api:post/orders
```

**Missing link target:**
```text
Validation failed:
Link target not found: orders:checkout:usecase:placeorder
```

**Invalid domain reference:**
```text
Validation failed:
Component "bad:module:usecase:test" references unknown domain: bad
```

**Multiple errors:**
```text
Validation failed:
Link source not found: api-1
Link target not found: usecase-1
Component "bad:mod:api:test" references unknown domain: bad
```

## Finding Near Matches

When looking up components, use `nearMatches()` to find similar components if exact match fails:

```typescript
const component = builder.findComponent({ eventName: 'order-place' })

if (!component) {
  const similar = builder.nearMatches({ eventName: 'order-place' })
}
```

Near matches are found by:
- String similarity (>50% character overlap)
- Same file, nearby line numbers (within 20 lines)
- Partial name matches

## Error Handling Patterns

### Try-Catch for Immediate Errors

```typescript
try {
  builder.addUseCase({
    domain: 'unknown',
    name: 'test',
    // ...
  })
} catch (error) {
  console.error(error.message)
  // Unknown domain: "unknown". Available domains: orders
}
```

### Check Before Building

```typescript
const validation = builder.validate()
if (!validation.valid) {
  console.error('Graph has errors:')
  validation.errors.forEach(e => console.error(`  - ${e}`))
  process.exit(1)
}

const graph = builder.build()
```

### Get Stats Before Build

```typescript
const stats = builder.stats()
console.log(`Components: ${stats.components}`)
console.log(`Links: ${stats.links}`)
console.log(`Warnings: ${stats.warnings}`)

// Check for orphans (unconnected components)
const orphans = builder.orphans()
if (orphans.length > 0) {
  console.warn('Orphan components:', orphans.map(c => c.id))
}
```

## Warnings vs Errors

The library distinguishes between errors (fail-fast) and warnings (informational):

**Errors** stop execution:
- Unknown domain
- Invalid name format
- Unknown custom type
- Build validation failures

**Warnings** are informational:
- Orphan components (no links)
- Registered but unused custom types
- Defined but unreferenced entities

Access warnings:
```typescript
const warnings = builder.warnings()
warnings.forEach(w => console.warn(w))
```

Add custom warnings:
```typescript
builder.addWarning('Domain "legacy" is deprecated')
```
