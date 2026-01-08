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

## Default Extraction Config

A ready-to-use extraction config is provided for teams adopting our decorator conventions.

### Usage

Import the default config in your project:

```typescript
import defaultConfig from '@living-architecture/riviere-extract-conventions/default-config'
```

Or reference it directly in your extraction tooling:
```bash
riviere extract --config ./node_modules/@living-architecture/riviere-extract-conventions/src/default-extraction.config.json
```

### What It Does

The default config detects all 6 component types using class-level decorators:

**Container decorators** (all public methods become separate components):
- **api** → all public methods in classes with `@APIContainer`
- **domainOp** → all public methods in classes with `@DomainOpContainer`
- **eventHandler** → all public methods in classes with `@EventHandlerContainer`

**Single-method decorators** (the one public method becomes the component):
- **useCase** → the single public method in classes with `@UseCase`
- **ui** → the single public method in classes with `@UI`

**Class-as-component decorator** (the class itself is the component):
- **event** → classes with `@Event`

Detection rules:
- Container types find `methods` in classes with decorators
- Class types find `classes` with decorators
- All decorators from `@living-architecture/riviere-extract-conventions`
- Path: `**/*.ts` (all TypeScript files)

The extractor (riviere-extract-ts) will:
- Extract all public methods from container classes as individual components
- Extract the single public method from UseCase/UI classes as the component
- Extract Event classes themselves as components

### Customization

The default config is a starting point. Teams can:
1. Copy it and modify detection rules
2. Add additional modules for different paths
3. Combine with other detection strategies (JSDoc, naming conventions)

## ESLint Enforcement

An ESLint plugin ensures all classes have component decorators.

### Setup

```javascript
import conventionsPlugin from '@living-architecture/riviere-extract-conventions/eslint-plugin'

export default [
  {
    files: ['src/domain/**/*.ts'],
    plugins: { conventions: conventionsPlugin },
    rules: { 'conventions/require-component-decorator': 'error' },
  },
]
```

### What It Checks

The `require-component-decorator` rule reports errors when classes lack component decorators:

**Valid decorators:** `@UseCase`, `@Event`, `@UI`, `@DomainOpContainer`, `@APIContainer`, `@EventHandlerContainer`, `@Custom('type')`, `@Ignore`

**Ignored:** Functions, interfaces, type aliases, anonymous classes

Use ESLint's `files` config to scope enforcement to specific paths.

## Principles

1. **Pure markers** - Decorators have no runtime behavior; they exist only for extraction
2. **ECMAScript standard** - Uses Stage 3 decorators (TypeScript 5.0+), not legacy experimentalDecorators
3. **Extractor-friendly** - Designed to be detected by ts-morph in riviere-extract-ts
