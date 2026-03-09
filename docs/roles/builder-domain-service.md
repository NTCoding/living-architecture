# builder-domain-service

`builder-domain-service` covers graph-building domain logic behind the public facade.

- Keep it in `packages/riviere-builder/src/features/building/domain/` and `packages/riviere-builder/src/platform/domain/`.
- Use it for construction, linking, enrichment, inspection, near-match logic, and related helpers.
- Do not turn this into a generic utility bucket; keep names tied to actual builder responsibilities.
