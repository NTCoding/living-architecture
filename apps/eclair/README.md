# Eclair

Web app for visualizing Riviere architecture graphs.

## Development

```bash
nx serve eclair
```

## Testing

### Unit tests (jsdom)

Fast tests using jsdom for DOM simulation:

```bash
pnpm nx test eclair
```

### Browser tests (real browsers)

Cross-browser tests using Playwright with Chromium, Firefox, and WebKit:

```bash
pnpm nx test:browser eclair
```

Requires Playwright browsers installed:

```bash
pnpm exec playwright install chromium firefox webkit
```

Browser tests run automatically in CI on all pull requests.

## Documentation

See [apps/docs](../docs) for full documentation.
