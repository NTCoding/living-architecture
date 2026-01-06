# riviere-extract-config

JSON Schema validation for extraction configuration DSL.

## Usage

```typescript
import {
  validateExtractionConfig,
  parseExtractionConfig,
  isValidExtractionConfig,
} from '@living-architecture/riviere-extract-config';

const config = { modules: [{ path: 'src/**', api: { find: 'class' } }] };

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

## Building

Run `nx build riviere-extract-config` to build the library.
