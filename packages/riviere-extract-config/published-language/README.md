# riviere-extract-config

JSON Schema validation for extraction configuration DSL.

The `description` in [package.json](package.json) is the source of truth for this
subdomain's purpose. See the generated
[domain guide](../../../docs/architecture/ddd/domain-guide.md) for its place in
the current domain landscape.

## Usage

```typescript
import {
  validateExtractionConfig,
  parseExtractionConfig,
  isValidExtractionConfig,
} from '@living-architecture/riviere-extract-config-published-language';

const config = { modules: [{ name: 'orders', path: 'orders', glob: 'src/**', api: { find: 'classes', where: { hasDecorator: { name: 'Controller' } } } }] };

if (isValidExtractionConfig(config)) {
  // config is typed as ExtractionConfig
}

const result = validateExtractionConfig(config);
if (result.valid) {
  // use result.data
} else {
  // handle result.errors
}
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) — Design principles and schema overview
- [extraction-config.schema.json](./extraction-config.schema.json) — JSON Schema reference

## Building

Run `nx build riviere-extract-config` to build the library.
