# Phase 12 Performance Baselines

Extraction performance baselines for connection detection (PRD 12), measured against the ecommerce-demo-app.

## Environment

- **Date**: 2026-02-06
- **Machine**: Apple M1 (arm64), macOS Darwin 24.6.0
- **Node.js**: v24.2.0

## Extraction Target

- **Repository**: ecommerce-demo-app
- **Domains**: 7 (orders, inventory, payment, shipping, notifications, bff, ui)
- **Components**: 74
- **Connections**: 57 certain + 4 uncertain = 61 total

## Timing (3 runs, median)

| Metric | Run 1 | Run 2 | Run 3 | Median |
|--------|-------|-------|-------|--------|
| **Total** | 0.72s | 0.69s | 0.73s | **0.72s** |
| Call graph | 0.71s | 0.69s | 0.72s | 0.71s |
| Async detection | 0.00s | 0.00s | 0.00s | 0.00s |
| Setup | 0.01s | 0.01s | 0.01s | 0.01s |

## Connection Breakdown

| Type | Count |
|------|-------|
| Sync (certain) | 32 |
| Async publish (EventPublisher -> Event) | 10 |
| Async subscribe (Event -> EventHandler) | 15 |
| Uncertain (unresolved) | 4 |
| **Total** | **61** |

## Validation

Ground truth validation performed against `expected-connections.json` in ecommerce-demo-app (certain connections only; uncertain links excluded):

- **57 certain connections**: zero false positives, zero false negatives (verified via `scripts/verify-connections.mjs`)
- **4 uncertain links**: classified separately, not counted as false positives or negatives (see below)
- **Schema compliance**: Ground truth uses `{source, target, type}` tuples matching Riviere schema Link structure. Validated via comparison script which normalizes to `source|target|type` keys.
- **Verification command**: `npm run verify:connections` in ecommerce-demo-app (runs `scripts/verify-connections.mjs`)

### Edge Case Scenarios

| Scenario | Present in Demo App | Handling |
|----------|-------------------|----------|
| Event published but no subscriber | No — all published events have at least one handler in the demo app | Covered by unit tests in `detect-publish-connections.spec.ts` (empty handler list produces publisher-to-event link only) |
| Event handler subscribing to external event | No — demo app is self-contained, no external events | Covered by unit tests in `detect-subscribe-connections.spec.ts` (unmatched event names produce no links) |
| Transitive connections through non-components | Yes — use cases call domain ops through internal methods | Verified: 21 UseCase-to-DomainOp connections in ground truth traverse through non-component intermediary code |

## Notes

- Call graph dominates total time (~99%)
- Async detection (publish + subscribe) is negligible (<1ms)
- 4 uncertain links are from `shipping:useCase:UpdateTrackingUseCase` where the receiver type is `any` (courier API client returns untyped response). These are classified as `_uncertain` by the extractor and excluded from the ground truth comparison. They do not violate SC-6 (zero false positives, zero false negatives) because SC-6 applies to certain connections only.
- Orders domain sync connections (API->UseCase, EventHandler->UseCase, UseCase->DomainOp, UseCase->EventPublisher) are excluded because orders uses container decorators (`find: "methods"`) and the call graph currently only traces class-level components
- Demo app refactoring (D3.2), ground truth (D3.1), and comparison scripts (D3.3) are in the ecommerce-demo-app repository
