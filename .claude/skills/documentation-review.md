# Documentation Review

Validate documentation changes in `apps/docs/` against the rules in `apps/docs/CLAUDE.md`.

## When to Run

Run before submitting any PR that modifies files in `apps/docs/`.

## Steps

1. **Read `apps/docs/CLAUDE.md`** to load current rules

2. **Identify changed files:**
   ```bash
   git diff main --name-only -- apps/docs/
   ```

3. **For each changed `.md` file, check:**

   **Format compliance:**
   - Reference pages: Does it match predicates.md format? (overview table, `###` per item, parameters table, `---` separators, `pageClass: reference` frontmatter)
   - Workflow pages: Does it follow step-N structure? (prerequisites, numbered sub-steps, output, next step)
   - Overview pages: Does it follow extract/index.md structure?

   **User journey fit:**
   - Which journey does this page serve? (Get Started, AI Extraction, TypeScript Extraction, Reference, Visualize)
   - Can you answer "what step is the user on?" If not, the page may not belong.

   **Cross-linking:**
   - Does the page have a See Also section with 3-5 links?
   - Are links absolute paths (`/reference/...` not `./...`)?
   - Do linked pages exist?

   **Terminology:**
   - Read `docs/architecture/domain-terminology/contextive/definitions.glossary.yml`
   - Flag any terms not in the glossary

   **Content rules:**
   - No YAML/TypeScript examples on reference pages (those go on `examples.md`)
   - No edge case narratives on reference pages
   - Code blocks specify language
   - No manually edited auto-generated files (`reference/api/generated/`, `reference/cli/cli-reference.md`)

4. **For sidebar changes (`.vitepress/config.ts`):**
   - Does every sidebar item map to a user task?
   - No items that exist "just because the content exists"

5. **Report findings** as a checklist:
   ```text
   ✅ extraction-rules.md — format matches predicates.md
   ❌ new-page.md — missing See Also section
   ❌ new-page.md — uses term "bounded context" not in glossary
   ```
