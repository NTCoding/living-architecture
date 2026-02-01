# AI Codebase Scanner Prompt

Use this prompt with an AI assistant to scan a codebase and identify architectural components for Rivière extraction config.

---

## Prompt

```text
Scan this codebase and identify architectural components for a Rivière extraction config.

For each domain (bounded context / module), find:

1. **APIs** — Entry points that receive external requests (REST controllers, GraphQL resolvers, gRPC services, message consumers)
   - Required metadata: `apiType` (REST, GraphQL, gRPC, WebSocket, Messaging)

2. **Use Cases** — Application-layer orchestration (command handlers, service methods that coordinate domain logic)
   - No required metadata

3. **Domain Operations** — Core business logic (domain services, aggregate methods, calculation engines)
   - Required metadata: `operationName`

4. **Events** — Domain events published when state changes (OrderPlaced, PaymentReceived)
   - Required metadata: `eventName`

5. **Event Handlers** — Subscribers that react to events (saga steps, projections, notification triggers)
   - Required metadata: `subscribedEvents` (list of event names)

6. **UI Pages** — User-facing screens or routes
   - Required metadata: `route`

For each component found, report:
- Component type (api, useCase, domainOp, event, eventHandler, ui)
- Name
- File path and line number
- Domain it belongs to
- Detection pattern that would match it (decorator, naming convention, JSDoc tag, class hierarchy)
- Any metadata values extractable from the code

Output as a table grouped by domain, then by component type.

After scanning, suggest an `extraction.config.yaml` with detection rules for each domain.
Use these predicates where appropriate:
- `hasDecorator` — class/method has a specific decorator
- `nameEndsWith` / `nameMatches` — naming convention
- `hasJSDoc` — JSDoc tag present
- `inClassWith` — method filtering by parent class
- `implementsInterface` — implements a known interface
- `extendsClass` — inherits from a base class

For metadata extraction, use these rules:
- `literal` — hardcoded value (e.g., apiType: "REST")
- `fromDecoratorName` — decorator name as value (e.g., @Get → "Get")
- `fromDecoratorArg` — decorator argument by position
- `fromClassName` / `fromMethodName` — name with optional transform
- `fromProperty` — value from a class property
- `fromGenericArg` — type from generic parameter
- `fromConstructorParams` — types from constructor injection

Apply transforms where names need cleaning:
- `removeSuffix` / `removePrefix` — strip naming convention artifacts
- `toKebabCase` / `toCamelCase` / `toPascalCase` — case conversion
```

## Usage

1. Open your project in an AI-capable editor or paste the prompt into a chat session
2. Point the AI at your source directories
3. Review the identified components against your domain knowledge
4. Use the suggested config as a starting point for `extraction.config.yaml`
5. Run `npx riviere extract --config extraction.config.yaml --dry-run` to verify counts

## Tips

- Start with one domain to validate the approach before scanning the full codebase
- Cross-reference results with your team's domain knowledge — AI may miss implicit boundaries
- The suggested config is a starting point; tune predicates based on `--dry-run` output
