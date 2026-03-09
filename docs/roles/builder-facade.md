# builder-facade

`builder-facade` is the public class API for programmatic graph building.

- Keep it on the public builder class in `packages/riviere-builder/src/features/building/domain/builder-facade.ts`.
- Use it to expose stable builder operations while delegating to narrower internal services.
- Do not bury low-level graph mutation details directly in the facade.
