# riviere-extract-conventions

Decorators for marking architectural components in TypeScript code.

## Purpose

Provides a convention-based approach to annotating code for architectural extraction. Teams adopting these decorators get:
- Consistent component marking across the codebase
- Deterministic extraction via riviere-extract-ts
- ESLint enforcement to ensure coverage (D2.3)

## Decorator Categories

### Container Decorators (class-level)
All public methods in the class inherit the component type:
- `@DomainOpContainer` - domain operation container
- `@APIContainer` - API endpoint container
- `@EventHandlerContainer` - event handler container

### Class-as-Component Decorators
The class itself is the component:
- `@UseCase` - use case class
- `@Event` - domain event class
- `@UI` - UI component class

### Method-level Decorators
Individual methods marked as components:
- `@DomainOp` - domain operation method
- `@APIEndpoint` - API endpoint method
- `@EventHandler` - event handler method

### Other
- `@Custom(type)` - custom component type
- `@Ignore` - exclude from analysis

## Principles

1. **Pure markers** - Decorators have no runtime behavior; they exist only for extraction
2. **ECMAScript standard** - Uses Stage 3 decorators (TypeScript 5.0+), not legacy experimentalDecorators
3. **Extractor-friendly** - Designed to be detected by ts-morph in riviere-extract-ts
