# Architecture Evolution MVP Plan

## Goal

- Add a new page in `apps/eclair` that feels like the existing domain map page but lets the user step backward and forward through architecture changes one commit at a time.
- Keep this as a design MVP only: hard-coded snapshots, hard-coded commit metadata, no real git integration.
- Optimize for legibility of change. The user should see what changed, not watch the whole diagram reshuffle.

## Working assumptions

- Reuse the domain map visual language, React Flow canvas, floating panels, and node styling as the starting point.
- Keep node ids and coordinates fixed across all steps. Do not recalculate layout per commit.
- When something is removed, keep it in the graph and fade it out or ghost it instead of deleting it from the canvas.
- Synthetic commit messages, hashes, and dates are fine for this MVP.
- One story gap exists in the prompt: removing `Orders Service B` leaves the mobile app without one of its read sources. Default MVP assumption: any orphaned read moves to `Orders Service A` in the same removal step unless we refine the story later.

## UX concept

- Main canvas copies the domain map page structure and overall feel.
- Floating commit card shows:
  - step count, for example `3 / 8`
  - commit title
  - short hash
  - date
  - short one-line description of the change
- Previous and next arrow buttons sit with the commit card and disable at the ends.
- The viewport fits once on initial load, then stays stable while the user moves between commits.
- Visual diff rules:
  - added: fade in and highlight briefly
  - changed: accent highlight only
  - removed: ghosted at low opacity, muted edges, non-interactive
  - unchanged: standard styling

## Hard-coded evolution story

0. Baseline: `Orders Service A`, `Orders Service B`, and `Orders Service C` each have their own database and `place order` API; each publishes `order placed` to the other two systems; Website reads A and B; Mobile reads B and C.
1. `Orders Service A dual-writes to Orders DB B`
2. `Orders Service B place order API removed`
3. `Website stops reading Orders Service B`
4. `Orders Service B removed`
5. `Orders Service A dual-writes to Orders DB C`
6. `Orders Service C place order API removed`
7. `Mobile app stops reading Orders Service C`
8. `Orders Service C removed`

For MVP coherence, step 4 implicitly redirects any remaining reads from B to A.

## Layout plan

- Keep a single superset layout for all steps.
- Suggested layout:
  - Website at upper left
  - Mobile at lower left
  - Services A, B, C across the middle row
  - Each service's database directly beneath it
- Keep all edges anchored to the same handles in every step.
- Use different edge treatment for read APIs vs write APIs vs events so the migration path is readable at a glance.

## Implementation approach

1. Create a new feature under `apps/eclair/src/features/architecture-evolution/` using the domain map page as the starting point.
2. Add a hard-coded snapshot model with:
   - stable nodes and edges
   - per-step commit metadata
   - per-item visual state such as `active`, `changed`, and `ghosted`
3. Render from the full graph superset and change visual state per step instead of physically removing items.
4. Add commit navigation controls and current-step metadata.
5. Add a new route and sidebar entry, likely `Architecture Evolution`.
6. Add focused tests for navigation, disabled arrow states, commit metadata, and ghosted removals.

## Technical notes

- React Flow supports controlled nodes and edges plus `hidden` and style-based visibility, so fixed positions plus opacity changes is the lowest-risk MVP path.
- React Flow's slideshow tutorial also points toward precomputed static layouts, which matches the minimal-movement requirement.
- Avoid calling `fitView` on every step. Reframing the viewport would hide the actual architecture change.
- If we later want true fade-out animation before removal, use a two-phase visual state. For this MVP we can stop at ghosting and never fully delete items.

## Deliverables

- New MVP page in `apps/eclair`
- Hard-coded evolution scenario data
- Domain-map-like UI for commit stepping
- Basic coverage for the stepper behavior
- This research note as the starting reference

## Open questions to confirm later

- Final route label: `Architecture Evolution` or a shorter label such as `Evolution`
- How much commit metadata to show in the card beyond title and date
- Whether ghosted removals should keep full labels visible or reduce to outline-only remnants
