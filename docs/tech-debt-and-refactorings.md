# Tech Debt and Future Refactorings

## Cloudflare build:deploy bypasses NX

**Issue:** Race condition in `@nx/vitest` plugin when processing vite.config.ts files concurrently on slower CI systems (Cloudflare Pages).

**Error:** `Cannot read properties of undefined (reading 'getStatus')`

**Root cause:** NX issue [#33091](https://github.com/nrwl/nx/issues/33091) - concurrent module loading creates race conditions.

**Workaround:** `build:deploy` script bypasses NX entirely and runs vitepress/vite directly. This only affects Cloudflare deployments - local dev and GitHub Actions use NX normally.

**When to revisit:** Check NX releases for a fix to #33091. Once fixed, restore the original `build:deploy` command:

```json
"build:deploy": "nx reset && nx build docs && nx build eclair && rm -rf dist && mkdir -p dist/eclair && cp -r apps/docs/.vitepress/dist/* dist/ && cp -r apps/eclair/dist/* dist/eclair/"
```
