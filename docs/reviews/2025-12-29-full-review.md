# Full Codebase Review - 2025-12-29

## Summary

- **Files reviewed:** ~150 production files + 15 test files sampled
- **Chunks processed:** 8
- **Total violations:** 18
- **Review rules:** `.claude/automatic-code-review/rules.md`

## Architecture/Modularity Violations

### 1. Forbidden Folder Name: `lib/`
**File:** `apps/eclair/src/lib/*`
**Severity:** High
**Issue:** Files are located in `src/lib/` folder. Per `codebase-structure.md`: "No generic folders. Every folder has domain meaning. Forbidden: utils/, helpers/, common/, shared/, core/, lib/."
**Affected Files:**
- `apps/eclair/src/lib/exportGraph.ts`
- `apps/eclair/src/lib/graphStats.ts`
- `apps/eclair/src/lib/handlePositioning.ts`
- `apps/eclair/src/lib/riviereTestData.ts`

**Fix:** Move files to appropriate feature folders:
- `exportGraph.ts` → `features/export/`
- `graphStats.ts` → `features/graph-analysis/`
- `handlePositioning.ts` → `features/full-graph/components/ForceGraph/`
- `riviereTestData.ts` → `test/fixtures/`

**Optional?:** Mandatory

### 2. Generic Naming: `extractDomainMapData`
**File:** `apps/eclair/src/features/domain-map/extractDomainMapData.ts:199`
**Severity:** Medium
**Issue:** Function name uses forbidden generic term "data". The guideline explicitly states: "Bad Example: `extractDomainMapData`. Just use `extractDomainMap`"
**Fix:** Rename to `extractDomainMap`
**Optional?:** Mandatory

### 3. Generic Naming: `extractDomainDetails`
**File:** `apps/eclair/src/features/domains/extractDomainDetails.ts:196`
**Severity:** Medium
**Issue:** Function name uses generic term "details"
**Fix:** Rename to `extractDomainDetail`
**Optional?:** Mandatory

## Coding Standards Violations

### 4. Incomplete Switch Statement
**File:** `apps/eclair/src/features/flows/components/NodeTypeBadge/NodeTypeBadge.tsx:7-23`
**Severity:** High
**Issue:** Switch statement in `getBadgeClass()` does not handle 'External' NodeType case. TypeScript doesn't error because the function returns `string`, but this creates an implicit undefined return.
**Fix:** Add `case 'External': return 'badge-external'`
**Optional?:** Mandatory

### 5. Inconsistent Domain Color Assignment
**File:** `apps/eclair/src/features/flows/components/DomainBadge/DomainBadge.tsx`
**Severity:** High
**Issue:** DomainBadge uses its own hash-based color assignment (8 colors), while `FullGraphPage` uses centralized `getDomainColor()` from `types.ts` (10 colors). Same domain shows different colors in different views.
**Fix:** Use centralized `getDomainColor()` function in DomainBadge
**Optional?:** Mandatory - UX bug

## Dangerous Fallback Values

### 6. Fallback Masking Null State
**File:** `apps/eclair/src/features/domain-map/DomainMapPage.tsx:118`
**Code:** `const isConnected = connectedDomains?.has(node.id) ?? false`
**Issue:** When `focusedDomain` is null, `connectedDomains` becomes null, and `?? false` silently masks this.
**Fix:** `const isConnected = focusedDomain !== null && connectedDomains?.has(node.id) === true`
**Optional?:** Mandatory

### 7. Default Link Type
**File:** `apps/eclair/src/features/flows/components/FlowTrace/FlowTrace.tsx:88`
**Code:** `extLink.type ?? 'sync'`
**Issue:** External link types should be explicit, not defaulted to 'sync' when undefined.
**Fix:** Validate `extLink.type` is always defined at the source
**Optional?:** Mandatory - data contract violation

### 8. Graph Name Fallback
**File:** `apps/eclair/src/features/full-graph/FullGraphPage.tsx:224`
**Code:** `graph.metadata.name ?? UNNAMED_GRAPH_EXPORT_NAME`
**Issue:** Hides missing graph metadata without validation at source
**Fix:** Validate at load/parse time, document if intentionally optional
**Optional?:** Medium - document intent

## Duplicated Code

### 9. File Select Handlers
**File:** `apps/eclair/src/features/comparison/ComparisonPage.tsx:273-303`
**Issue:** `handleBeforeFileSelect` and `handleAfterFileSelect` contain nearly identical FileReader logic (lines 273-287 and 289-303).
**Fix:** Extract common logic:
```typescript
function createFileSelectHandler(setState: (state: UploadState) => void): (file: File) => void {
  return (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result
      if (typeof content !== 'string') {
        setState({ status: 'error', error: { message: 'Failed to read file' } })
        return
      }
      setState(parseGraphFile(content, file.name))
    }
    reader.onerror = () => {
      setState({ status: 'error', error: { message: 'Failed to read file' } })
    }
    reader.readAsText(file)
  }
}
```
**Optional?:** Mandatory

### 10. Hash Function Duplication
**File:** `apps/eclair/src/features/flows/components/DomainBadge/DomainBadge.tsx:5-10`
**Issue:** Custom `hashString()` function duplicates logic in `getDomainColor()` from `types.ts`
**Fix:** Use centralized function
**Optional?:** Mandatory

### 11. Accordion Component Pattern
**Files:**
- `apps/eclair/src/features/domains/components/EntityAccordion/EntityAccordion.tsx:60-87`
- `apps/eclair/src/features/domains/components/EventAccordion/EventAccordion.tsx:34-85`
**Issue:** Both implement nearly identical accordion expand/collapse patterns
**Fix:** Extract reusable `AccordionHeader` component
**Optional?:** Mandatory

### 12. Duplicate Edge Type Assignment
**File:** `apps/eclair/src/features/full-graph/graphFocusing/filterByNodeType.ts:89-94`
**Code:**
```typescript
if (originalEdge.type !== undefined) {
  rewiredEdge.type = originalEdge.type
}
if (originalEdge.type !== undefined) {
  rewiredEdge.type = originalEdge.type
}
```
**Issue:** Exact code duplication - same assignment appears twice
**Fix:** Remove duplicate lines 92-94
**Optional?:** Mandatory

## Testing Standards Violations

### 13. Missing Vitest Import
**File:** `apps/eclair/src/contexts/GraphContext.test.tsx`
**Issue:** Uses `vi`, `beforeEach`, `afterEach` without importing from 'vitest'
**Fix:** Add `import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'`
**Optional?:** Mandatory

### 14. Multiple Concepts in Single Test
**File:** `packages/cli/src/commands/builder/add-component.spec.ts:422-427`
**Issue:** Test "returns Unknown error for non-Error values" has 4 assertions checking 4 different input types (string, null, undefined, number)
**Fix:** Split into 4 separate tests
**Optional?:** Mandatory

## Other Findings

### 15. Empty Error Handler
**File:** `apps/eclair/src/features/domains/components/DomainContextGraph/DomainContextGraph.tsx:139-141`
**Code:** `const ignoreFullscreenError = (): void => { return }`
**Issue:** Empty no-op function to ignore errors is a code smell
**Fix:** Add inline error handler with clear comment explaining why fullscreen API may fail (e.g., sandboxed iframes)
**Optional?:** Medium

### 16. Weak Schema Validation
**File:** `apps/eclair/src/features/events/EventsPage.tsx:7-9, 55`
**Code:** `function isValidSchemaObject(value: unknown): value is Record<string, unknown>`
**Issue:** `Record<string, unknown>` is too loose - doesn't validate actual schema structure
**Fix:** Use Zod for proper validation per `standard-patterns.md`
**Optional?:** Medium

### 17. Clipboard Error Silently Ignored
**File:** `apps/eclair/src/features/flows/components/CodeLinkMenu/CodeLinkMenu.tsx:90-95`
**Issue:** Clipboard errors are silently swallowed without logging
**Fix:** Log error for debugging or document why expected
**Optional?:** Low

### 18. Conditional Spread Pattern Inconsistency
**Files:**
- `packages/cli/src/commands/builder/add-component.ts:153`
- `packages/cli/src/commands/builder/add-component.ts:254`
- `packages/cli/src/commands/builder/link-external.ts:30-31`
**Issue:** Uses truthy check (`options.x ?`) instead of explicit `options.x !== undefined`
**Fix:** Standardize to `!== undefined` pattern
**Optional?:** Low - style consistency

## Suggested Updates to Conventions

Based on patterns found in this review:

1. **Add explicit forbidden folder check to CI** - The `lib/` folder violation suggests automated enforcement would help
2. **Create domain color utility guideline** - Document that domain visual identity must use centralized color function
3. **Add accordion base component** - Create shared accordion primitives to prevent duplication
4. **Expand naming examples** - Add function naming examples to `software-design.md` (currently focuses on class/variable names)
5. **Add import verification for tests** - Consider eslint rule to ensure vitest imports are present

## Violations by Severity

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 5 |
| Medium | 6 |
| Low | 7 |

## Packages Summary

| Package | Status | Violations |
|---------|--------|------------|
| `apps/eclair` | FAIL | 14 |
| `packages/riviere-query` | PASS | 0 |
| `packages/riviere-builder` | PASS | 0 |
| `packages/cli` | PASS | 4 (all low priority) |

---

*Generated by full-codebase-review plugin*
