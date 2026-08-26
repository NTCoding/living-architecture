# Tech Debt and Future Refactorings

## Extract the role enforcement published language

**Issue:** The public configuration accepted by `role(...)` is currently owned by the role enforcement domain model because this subdomain has no published language package.

**Current model:** `RoleTarget`, `ApprovedInstance`, and `RoleConstraints` are value objects in the domain model. The `role(...)` function preserves the convenient data syntax used by configuration authors and parses that input into the value objects.

**Future refactoring:** Create `@living-architecture/riviere-role-enforcement-published-language` and move the public role configuration API there. Published language may include value objects when they provide validation, type safety, or convenience to consumers.

**When to revisit:** Before the role configuration API is independently versioned or consumed without the domain model package.

## Cloudflare build:deploy bypasses NX

**Issue:** Race condition in `@nx/vitest` plugin when processing vite.config.ts files concurrently on slower CI systems (Cloudflare Pages).

**Error:** `Cannot read properties of undefined (reading 'getStatus')`

**Root cause:** NX issue [#33091](https://github.com/nrwl/nx/issues/33091) - concurrent module loading creates race conditions.

**Workaround:** `build:deploy` script bypasses NX entirely and runs tsc/vitepress/vite directly. This only affects Cloudflare deployments - local dev and GitHub Actions use NX normally.

**When to revisit:** Check NX releases for a fix to #33091. Once fixed, restore the original `build:deploy` command:

```json
"build:deploy": "nx reset && nx build docs && nx build eclair && rm -rf dist && mkdir -p dist/eclair && cp -r apps/docs/.vitepress/dist/* dist/ && cp -r apps/eclair/dist/* dist/eclair/"
```
