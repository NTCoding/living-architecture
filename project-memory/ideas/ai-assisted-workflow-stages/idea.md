# AI-Assisted Workflow Stages

**Status:** Captured

**Need level:** Definitely needed

**Source:** `docs/project/PRD/riviere-extraction-workflows-v1/PRD.md` and planning discussion for `riviere-extraction-workflows-v1`

**Reason deferred:** Deferred from the V1 PRD so V1 can focus on the core `extract → link → validate → write graph` workflow for `../ecommerce-demo-app` and deliver the first slice faster.

**Priority signal:** User said the deferred items are essential and “we need to do them at some point”; no ordering priority confirmed.

**Dependencies:** V1 workflow architecture should leave a stage-extension seam so AI-assisted stages can later fit into the workflow model without becoming an awkward bolt-on.

---

## Summary

Add AI-assisted stages as Rivière-owned workflow stages in future product work.

The V1 architecture must not implement AI-assisted stages, but it should avoid assuming every future workflow stage is deterministic TypeScript extraction.

## Why this may matter

The user confirmed this is not rejected work and should not fall off the roadmap. The user also confirmed that “AI is coming”; it was moved out of V1 scope to deliver the first slice faster.

## Open questions

- How should AI-assisted Rivière stages be configured at product level without turning workflows into generic prompt runners?
- How should future AI-assisted stages preserve the product principle that workflows do not provide capabilities the CLI does not provide?

## Links

- `docs/project/PRD/riviere-extraction-workflows-v1/PRD.md`
- `docs/project/PRD/riviere-extraction-workflows-v1/ARCH.md`
- `docs/project/PRD/riviere-extraction-workflows-v1/deferred-items.md`
