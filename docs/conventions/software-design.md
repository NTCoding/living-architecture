# Software Design Principles

Professional software design patterns and principles for writing maintainable, well-structured code.

## Critical Rules

🚨 **SD-001: Fail-fast over silent fallbacks.** Never use fallback chains (`value ?? backup ?? 'unknown'`). If data should exist, validate and throw a clear error.

🚨 **SD-002: Strive for maximum type-safety. No `any`. No `as`.** Type escape hatches defeat TypeScript's purpose. There's always a type-safe solution (except `as const` which is allowed)

🚨 **SD-003: Make illegal states unrepresentable.** Use discriminated unions, not optional fields. If a state combination shouldn't exist, make the type system forbid it.

🚨 **SD-004: Inject dependencies, don't instantiate.** No `new SomeService()` inside methods. Pass dependencies through constructors.

🚨 **SD-005: Intention-revealing names only.** Never use `data`, `utils`, `helpers`, `handler`, `processor`. Name things for what they do in the domain.

🚨 **SD-006: No code comments.** Comments are a failure to express intent in code. If you need a comment to explain what code does, the code isn't clear enough—refactor it.

🚨 **SD-007: Use Zod for runtime validation.** In TypeScript, use Zod schemas for parsing external data, API responses, and user input. Type inference from schemas keeps types and validation in sync.

## When This Applies

- Writing new code (these are defaults, not just refactoring goals)
- Refactoring existing code
- Code reviews and design reviews
- During TDD REFACTOR phase
- When analyzing coupling and cohesion

## Core Philosophy

Well-designed, maintainable code is far more important than getting things done quickly. Every design decision should favor:
- **Clarity over cleverness**
- **Explicit over implicit**
- **Fail-fast over silent fallbacks**
- **Loose coupling over tight integration**
- **Intention-revealing over generic**

## SD-006: Code Without Comments

Never write comments - write expressive code instead.

## Object Calisthenics

Apply object calisthenics principles:

### The Nine Rules

1. **SD-008: One level of indentation per method**
    - In practice, I will tolerate upto 3

2. **SD-009: Don't use the ELSE keyword**
    - Use early returns instead

3. **SD-010: Wrap all primitives and strings**
    - Create value objects
    - Encapsulate validation logic
    - Make domain concepts explicit

4. **SD-011: First class collections**
    - Classes with collections should contain nothing else

5. **SD-012: One dot per line**

6. **SD-013: Don't abbreviate**
    - Use full, descriptive names

7. **SD-014: Keep all entities small**
    - Small classes (< 150 lines)
    - Small methods (< 10 lines)
    - Small packages/modules
    - Easier to understand and maintain

8. **SD-015: Avoid getters/setters/properties on entities**
    - Tell, don't ask
    - Objects should do work, not expose data

### When to Apply

- **During refactoring:**

- **During code review:**

## SD-016: Feature Envy Detection

Method uses another class's data more than its own? Move it there.

```typescript
// ❌ FEATURE ENVY - obsessed with Order's data
class InvoiceGenerator {
  generate(order: Order): Invoice {
    const total = order.getItems().map(i => i.getPrice() * i.getQuantity()).reduce((a,b) => a+b, 0)
    return new Invoice(total + total * order.getTaxRate() + order.calculateShipping())
  }
}

// ✅ Move logic to the class it envies
class Order {
  calculateTotal(): number { /* uses this.items, this.taxRate */ }
}
class InvoiceGenerator {
  generate(order: Order): Invoice { return new Invoice(order.calculateTotal()) }
}
```

**Detection:** Count external vs own references. More external? Feature envy.

## SD-017: Dependency Inversion Principle

Don't instantiate dependencies inside methods. Inject them.

```typescript
// ❌ TIGHT COUPLING
class OrderProcessor {
  process(order: Order): void {
    const validator = new OrderValidator()  // Hard to test/change
    const emailer = new EmailService()      // Hidden dependency
  }
}

// ✅ LOOSE COUPLING
class OrderProcessor {
  constructor(private validator: OrderValidator, private emailer: EmailService) {}
  process(order: Order): void {
    this.validator.isValid(order)  // Injected, mockable
    this.emailer.send(...)         // Explicit dependency
  }
}
```

**Scan for:** `new X()` inside methods, static method calls. Extract to constructor.

## SD-001: Fail-Fast Error Handling

**NEVER use fallback chains that hide missing data:**
```typescript
value ?? backup ?? default ?? 'unknown'  // ❌
```

Validate and throw clear errors instead:

```typescript
// ❌ SILENT FAILURE - hides problems
return content.eventType ?? content.className ?? 'Unknown'

// ✅ FAIL FAST - immediate, debuggable
if (!content.eventType) {
  throw new Error(`Expected 'eventType', got undefined. Keys: [${Object.keys(content)}]`)
}
return content.eventType
```

**Error format:** `Expected [X]. Got [Y]. Context: [debugging info]`

### When `??` Is Acceptable

Single `??` with a legitimate default is fine when:
- The field is intentionally optional by design
- The default represents the correct initial state (not a fallback hiding missing data)
- No data is being masked or lost

```typescript
// ✅ OK - optional array with correct initial state
const items = [...(existingItems ?? []), ...newItems]

// ✅ OK - optional config with sensible default
const timeout = options?.timeout ?? 5000

// ❌ BAD - hiding which field actually had data
const name = user.displayName ?? user.username ?? user.email ?? 'Anonymous'

// ❌ BAD - masking missing required data
const id = response.id ?? generatedId ?? 'unknown'
```

**The test:** Would you want to know if the value was missing? If yes, fail fast. If the default is genuinely correct, `??` is fine.

## SD-005: Naming Conventions

**Principle:** Use business domain terminology and intention-revealing names. Never use generic programmer jargon.

### Forbidden Generic Names

**NEVER use these names partially or fully:**
- `data`
- `utils`
- `helpers`
- `common`
- `shared`
- `manager`
- `handler`
- `processor`

These names are meaningless - they tell you nothing about what the code actually does.

Bad Example: `ProductData`. Just use `Product` or something more precise
Bad Example: `extractDomainMapData`. Just use `extractDomainMap`

### Intention-Revealing Names

**Instead of generic names, use specific domain language:**

```typescript
// ❌ GENERIC - meaningless
class DataProcessor {
  processData(data: any): any {
    const utils = new DataUtils()
    return utils.transform(data)
  }
}

// ✓ INTENTION-REVEALING - clear purpose
class OrderTotalCalculator {
  calculateTotal(order: Order): Money {
    return taxCalculator.applyTax(order.subtotal, order.taxRate)
  }
}
```

### Naming Checklist

**For classes:**
- Does the name reveal what the class is responsible for?
- Is it a noun (or noun phrase) from the domain?
- Would a domain expert recognize this term?

**For methods:**
- Does the name reveal what the method does?
- Is it a verb (or verb phrase)?
- Does it describe the business operation?

**For variables:**
- Does the name reveal what the variable contains?
- Is it specific to this context?
- Could someone understand it without reading the code?

### Refactoring Generic Names

When you encounter generic names:

1. **Understand the purpose**: What is this really doing?
2. **Ask domain experts**: What would they call this?
3. **Extract domain concept**: Is there a domain term for this?
4. **Rename comprehensively**: Update all references

## SD-018: Type-Driven Design

**Principle:** Follow Scott Wlaschin's type-driven approach to domain modeling. Express domain concepts using the type system.

### Make Illegal States Unrepresentable

Use types to encode business rules:

```typescript
// ❌ PRIMITIVE OBSESSION - illegal states possible
interface Order {
  status: string  // Could be any string
  shippedDate: Date | null  // Could be set when status != 'shipped'
}

// ✓ TYPE-SAFE - illegal states impossible
type UnconfirmedOrder = { type: 'unconfirmed', items: Item[] }
type ConfirmedOrder = { type: 'confirmed', items: Item[], confirmationNumber: string }
type ShippedOrder = { type: 'shipped', items: Item[], confirmationNumber: string, shippedDate: Date }

type Order = UnconfirmedOrder | ConfirmedOrder | ShippedOrder
```

### Avoid Type Escape Hatches

**STRICTLY FORBIDDEN without explicit user approval:**
- `any` type
- `as` type assertions (`as unknown as`, `as any`, `as SomeType`) (`as const` is allowed)
- `@ts-ignore` / `@ts-expect-error`

There is always a better type-safe solution. These make code unsafe and defeat TypeScript's purpose.

### Use the Type System for Validation

```typescript
// ✓ TYPE-SAFE - validates at compile time
type PositiveNumber = number & { __brand: 'positive' }

function createPositive(value: number): PositiveNumber {
  if (value <= 0) {
    throw new Error(`Expected positive number, got ${value}`)
  }
  return value as PositiveNumber
}

// Can only be called with validated positive numbers
function calculateDiscount(price: PositiveNumber, rate: number): Money {
  // price is guaranteed positive by type system
}
```

## SD-019: Use Zod, don't use type guards

**Principle:** Use Zod schemas to construct types. Do not use type guards. A Zod schema belongs to the object, the type guard is scattered anywhere decoupling the object's type and validation of the type.

```typescript
// ✅ Define a zod schema and construct valid objects with it
const DetectionRuleSchema = z.object({
  find: z.enum(['class', 'function', 'decorator']),
  where: z.object({ nameMatches: z.string() })
})
type DetectionRule = z.infer<typeof DetectionRuleSchema>

// Config loader parses once at the boundary
function loadConfig(raw: unknown): Config {
  return ConfigSchema.parse(raw)  // Validated, typed, done
}

// ❌ SCATTERED VALIDATION - don't use type guards. The logic for validating an object's type should be owned by the type.
function isDetectionRule(rule: unknown): rule is DetectionRule {
  return typeof rule === 'object' && rule !== null && 'find' in rule && 'where' in rule
}
```

**The test:** Is the input `unknown` or external data? Parse with Zod at the boundary, not with scattered type guards.

## SD-020: Prefer Immutability

**Principle:** Default to immutable data. Mutation is a source of bugs—unexpected changes, race conditions, and difficult debugging.

### The Problem: Mutable State

```typescript
// MUTABLE - hard to reason about
function processOrder(order: Order): void {
  order.status = 'processing'  // Mutates input!
  order.items.push(freeGift)   // Side effect!
}

// Caller has no idea their object changed
const myOrder = getOrder()
processOrder(myOrder)
// myOrder is now different - surprise!
```

### The Solution: Return New Values

```typescript
// IMMUTABLE - predictable
function processOrder(order: Order): Order {
  return {
    ...order,
    status: 'processing',
    items: [...order.items, freeGift]
  }
}

// Caller controls what happens
const myOrder = getOrder()
const processedOrder = processOrder(myOrder)
// myOrder unchanged, processedOrder is new
```

### Application Rules

- Prefer `const` over `let`
- Prefer spread (`...`) over mutation
- Prefer `map`/`filter`/`reduce` over `forEach` with mutation
- If you must mutate, make it explicit and contained

## SD-021: YAGNI - You Aren't Gonna Need It

**Principle:** Don't build features until they're actually needed. Speculative code is waste—it costs time to write, time to maintain, and is often wrong when requirements become clear.

### The Problem: Speculative Generalization

```typescript
// YAGNI VIOLATION - over-engineered for "future" needs
interface PaymentProcessor {
  process(payment: Payment): Result
  refund(payment: Payment): Result
  partialRefund(payment: Payment, amount: Money): Result
  schedulePayment(payment: Payment, date: Date): Result
  recurringPayment(payment: Payment, schedule: Schedule): Result
  // ... 10 more methods "we might need"
}

// Only ONE method is actually used today
```

### Application Rules

- Build the simplest thing that works
- Add capabilities when requirements demand them, not before
- "But we might need it" is not a requirement

## SD-022: Never Mutate Function Parameters

**Principle:** Function parameters belong to the caller. Mutating them creates hidden side effects that callers don't expect.

### Detection Patterns

Scan for mutation methods called on function parameters:
- `.push()`, `.pop()`, `.splice()`, `.sort()`, `.reverse()` on array params
- `.set()`, `.delete()` on Map/Set params
- `.removeSourceFile()`, `.remove*()` on object params
- Direct property assignment on params (`param.field = value`)

### Example (BAD)

```typescript
function detectConnections(project: Project): Connection[] {
  // Mutates caller's project — caller doesn't expect this
  project.removeSourceFile(testFile)
  return analyzeProject(project)
}
```

### Example (GOOD)

```typescript
function detectConnections(project: Project): Connection[] {
  // Derive a filtered view without mutating the original
  const sourceFiles = project.getSourceFiles().filter(f => !isTestFile(f))
  return analyzeSourceFiles(sourceFiles)
}
```

## When Tempted to Cut Corners

**STOP if you're about to:**
- Use `??` chains → fail fast with clear error instead
- Use `any` or `as` → fix the types, not the symptoms
- Use `new X()` inside a method → inject through constructor
- Name something `data`, `utils`, `handler` → use domain language
- Add a getter → ask if the object should do the work instead
- Skip refactor because "it works" → refactor IS part of the work
- Write a comment → make the code self-explanatory
- Mutate a parameter → return a new value
- Build "for later" → build what you need now
