# Entities

The Entities view lists all domain entities in your architecture.

[Screenshot: Entities view with searchable list of entities]

## What Are Entities?

Entities are domain objects with identity—the core data models in your bounded contexts. Examples: `Order`, `Customer`, `Product`, `Invoice`.

## Entity List

Entities display as expandable accordions:

[Screenshot: Collapsed entity row]

**Collapsed view shows:**
- Entity name
- Domain badge

**Click to expand:**

[Screenshot: Expanded entity with description and invariants]

**Expanded view shows:**
- Description (what this entity represents)
- Invariants (business rules this entity enforces)
- Link to view on Full Graph

## Filtering

- **Search** — Filter by entity name or domain
- **Domain filter** — Show entities from specific domains only

## Entity Details

### Description

Explains what the entity represents in the domain. Example:

> Represents a customer order with line items, shipping address, and payment status.

### Invariants

Business rules the entity enforces. Example:

> - Order total must equal sum of line item totals
> - Cannot ship to an incomplete address
> - Payment must be captured before shipping

Invariants help developers understand what the entity guarantees.

## View on Graph

Click **View on Graph** to:

1. Navigate to Full Graph view
2. Center on this entity
3. Highlight its connections

This shows which components read or write this entity.

## Next Steps

- [Events](./events) — See domain events
- [Domain Detail](./domain-detail) — Explore entities within a domain
