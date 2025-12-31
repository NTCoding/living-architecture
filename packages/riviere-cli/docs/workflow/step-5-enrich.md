# Step 5: Enrich Components

## Objective

Add semantic information to DomainOps — state changes, business rules, and operation behavior.

## Prerequisites

- **Do not use plan mode.** Execute directly.
- Graph with linked components from Step 4.

## Generate Checklist

```bash
npx riviere builder component-checklist --type=DomainOp --output=".riviere/step-5-checklist.md"
```

## Process

**Prefix every message with:** `[Working through step-5 checklist and marking items as done]`

**The checklist is the only source of work. Do not explore the codebase or generate your own list.**

1. Generate checklist (if not exists)
2. Read `.riviere/step-5-checklist.md`
3. Find unchecked items `- [ ]`
4. For each item, read source file and enrich
5. Mark items as `- [x]` in the checklist
6. Continue until all items are checked

For each DomainOp:

### 1. Identify State Changes

Look for entity state transitions:
```typescript
this.status = 'placed';           // Draft → Placed
this.state = OrderState.CONFIRMED; // Placed → Confirmed
```

Capture as: `from:[States],to:[States]` (brackets = array, can list multiple)
Examples:
- `from:[Draft],to:[Placed]` — single state transition
- `from:[Draft,Pending],to:[Active]` — multiple source states

### 2. Identify Business Rules

Look for validation logic:
```typescript
if (this.items.length === 0) throw new Error('...');   // must have items
if (this.total <= 0) throw new Error('...');           // total must be positive
```

Capture as plain English rules.

### 3. Identify Operation Behavior

Look for what the operation reads, validates, modifies, and emits:

```typescript
// Reads (parameters and state accessed)
const items = this.items;             // reads: "this.items"
const total = params.amount;          // reads: "amount parameter"

// Validates (preconditions checked)
if (this.state !== 'Draft') throw     // validates: "state === Draft"
if (!items.length) throw              // validates: "items.length > 0"

// Modifies (state changes made)
this.state = 'Placed';                // modifies: "this.state ← Placed"
this.total = sum;                     // modifies: "this.total ← calculated sum"

// Emits (events published)
emit(new OrderPlaced(...));           // emits: "OrderPlaced event"
```

### 4. Enrich via CLI

**Fetch the CLI reference for `enrich` command syntax:**
```
https://raw.githubusercontent.com/NTCoding/living-architecture/main/packages/riviere-cli/docs/generated/cli-reference.md
```

**Best effort on all fields.** Add every value you identify — state changes, business rules, reads, validates, modifies, emits. All options are repeatable.

### 5. Mark Done

```markdown
- [x] orders:domainop:order.begin (src/domain/Order.ts:23)
```

## Output

Updated `.riviere/step-5-checklist.md` with all DomainOps checked.

## Feedback

If user reports problems or missing elements, identify the root cause, update the relevant config files, and re-run the affected step.

## Completion

Present enrichment summary showing how many DomainOps were enriched.

**Step 5 complete.** Wait for user feedback before proceeding.
