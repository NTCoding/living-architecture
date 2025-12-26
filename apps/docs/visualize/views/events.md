# Events

The Events view catalogs all domain events—what gets published and who handles them.

[Screenshot: Events view with event list showing publishers and handlers]

## What Are Events?

Domain events represent something that happened in the system. Examples: `OrderPlaced`, `PaymentReceived`, `ShipmentDispatched`. Events enable loose coupling between domains.

## Statistics

The top row shows:

| Stat | Description |
|------|-------------|
| Total Events | Number of unique events |
| Unique Publishers | Components that publish events |

## Event List

Events display as expandable accordions:

[Screenshot: Collapsed event row]

**Collapsed view shows:**
- Event name
- Domain badge
- Publisher count
- Handler count

**Click to expand:**

[Screenshot: Expanded event with payload and handlers]

**Expanded view shows:**
- Event description
- Payload schema (what data the event carries)
- Publishers (which components emit this event)
- Handlers (which components react to this event)
- Link to view on Full Graph

## Filtering

- **Search** — Filter by event name
- **Domain filter** — Show events from specific domains

## Event Details

### Payload Schema

Shows the data structure of the event:

```json
{
  "orderId": "string",
  "customerId": "string",
  "total": "Money",
  "items": "OrderItem[]"
}
```

### Publishers

Components that emit this event. Click a publisher to view it on the Full Graph.

### Handlers

Components that subscribe to this event. Shows cross-domain event handling.

## View on Graph

Click **View on Graph** to:

1. Navigate to Full Graph view
2. Center on this event
3. Highlight publishers and handlers

This visualizes the event's flow through the system.

## Next Steps

- [Flows](./flows) — See events in execution context
- [Compare](./compare) — Track event changes between versions
