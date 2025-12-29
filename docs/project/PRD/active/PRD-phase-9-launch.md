# PRD: Phase 9 — Launch

**Status:** Planning

**Depends on:** Phase 8 (Riviere CLI)

---

## 1. Problem

We need to make Living Architecture publicly available for early adopters:

- **npm packages** — riviere-query, riviere-builder, riviere-cli, riviere-schema published and installable
- **Hosted Éclair** — Visualizer accessible without local setup
- **Documentation** — Guides, API reference, examples available online
- **Landing page** — Entry point explaining what this is and why to use it

Currently nothing is published or deployed. Early adopters have no way to try the tools.

---

## 2. Design Principles

1. **Early adopter focus** — Functional and documented, not polished. Ship fast, iterate based on feedback.

2. **Single domain** — Everything under `living-architecture.dev`. Consistent brand, simpler setup.

3. **Automated releases** — CI/CD for both npm publishing and site deployment. No manual steps.

4. **Minimal landing page** — Clear value proposition, links to docs/Éclair. Not a marketing site.

5. **Pre-release versioning** — Start at 0.1.0. Breaking changes expected. Signal early-stage clearly.

6. **Conventional commits** — All commits follow conventional commit format for automated changelog generation.

---

## 3. What We're Building

### URL Structure

| Path | Content |
|------|---------|
| `living-architecture.dev` | Landing page |
| `living-architecture.dev/docs` | Documentation (VitePress) |
| `living-architecture.dev/eclair` | Visualizer app |

### npm Packages

| Package | Initial Version | Description |
|---------|-----------------|-------------|
| `@living-architecture/riviere-query` | 0.1.0 | Query graphs in browser/Node.js |
| `@living-architecture/riviere-builder` | 0.1.0 | Build graphs programmatically |
| `@living-architecture/riviere-cli` | 0.1.0 | CLI for AI-assisted extraction |
| `@living-architecture/riviere-schema` | 0.1.0 | Schema definitions and validation |

### Landing Page

Simple static page:
- What is Living Architecture? (1 paragraph)
- Key capabilities (3-4 bullet points)
- Links: Docs, Éclair, GitHub, npm
- Example visualization screenshot

### Demo Application

The **ecommerce-demo-app** (github.com/NTCoding/ecommerce-demo-app) serves as a complete example:
- Real TypeScript codebase with domain-driven architecture
- Uses published npm packages (`@living-architecture/riviere-cli`)
- Architecture extracted using AI-assisted workflow
- Includes custom types (message queues, external integrations)
- Pre-extracted graph viewable in Éclair
- Contains `.riviere/` folder with extracted graph

This proves the full workflow works and gives early adopters a realistic reference.

### Deployment Infrastructure

- **Netlify** for hosting all three apps (landing, docs, Éclair)
- **GitHub Actions** for npm publishing on release tags
- **Automated deploys** on push to main

---

## 4. What We're NOT Building

- Marketing website with multiple pages
- User accounts or authentication
- Analytics dashboard
- Paid features or tiers
- Custom domain email
- Announcement/launch communications (blog, social media)

---

## 5. Success Criteria

**npm Publishing:**
- [ ] All 4 packages published to npm at 0.1.0
- [ ] `npm install @living-architecture/riviere-cli` works
- [ ] `npx riviere --help` runs successfully
- [ ] Package READMEs link to docs

**Hosting:**
- [ ] `living-architecture.dev` loads landing page
- [ ] `living-architecture.dev/docs` loads documentation
- [ ] `living-architecture.dev/eclair` loads visualizer
- [ ] HTTPS enabled on all paths
- [ ] Deploys automatically on push to main

**Content:**
- [ ] Landing page explains value proposition
- [ ] Docs cover getting started, API reference, examples
- [ ] At least one complete example graph included

**Demo:**
- [ ] Demo app uses published riviere-cli
- [ ] Demo loads and works in Éclair end-to-end

---

## 6. Resolved Questions

1. **Domain** — `living-architecture.dev` needs to be registered. Added to M3 deliverables.
2. **npm scope** — `@living-architecture` is owned and ready.
3. **Versioning** — Start at 0.1.0 (pre-release). Breaking changes expected.
4. **Changelog** — Auto-generate from conventional commits using release-please or similar.
5. **Commit enforcement** — commitlint + husky locally; CI validates PR titles follow conventional format.
6. **riviere-schema** — Will be published (move to packages/, remove private flag, cleanup trigger field).

---

## 7. Milestones

### M1: npm packages can be published

Packages have correct metadata, repo is ready for public release.

#### Deliverables

- **D1.1:** riviere-schema prepared for publishing
  - Move from repo root to `packages/riviere-schema/`
  - Remove `"private": true`
  - Change graph schema version from `1.0` to `0.1` (align with npm package version)
  - Update all example graphs to use version `0.1`
  - Remove `trigger` field from `stateTransition` definition
  - Add `publishConfig.access: "public"`
  - Acceptance: `npm pack` succeeds, schema tests pass, all graphs use version 0.1
  - Verification: Dry-run pack, run tests, validate example graphs

- **D1.2:** Package.json files configured for publishing
  - Add `publishConfig.access: "public"` to all 4 packages
  - Set version to 0.1.0
  - Acceptance: `npm pack` succeeds for each package
  - Verification: Dry-run pack in CI

- **D1.3:** GitHub Actions workflow for npm publish
  - Trigger on version tag push (e.g., `v0.1.0`)
  - Publish all packages to npm
  - Acceptance: Tagged release publishes packages
  - Verification: Manual test with dry-run, then real publish

- **D1.4:** Package READMEs reviewed and updated
  - Installation instructions correct
  - Links to docs verified working
  - Basic usage example included
  - Acceptance: Each package has useful README with working links
  - Verification: Review content, test links

- **D1.5:** Root README reviewed and updated
  - Project description current
  - All links verified working (docs, npm, Éclair, GitHub)
  - Acceptance: README is accurate and all links resolve
  - Verification: Manual link check

- **D1.6:** LICENSE file added
  - MIT license
  - Acceptance: LICENSE file exists at repo root
  - Verification: File exists

- **D1.7:** CONTRIBUTING.md created
  - How to contribute
  - Commit message format (conventional commits)
  - Development setup
  - Acceptance: Clear contribution guidelines
  - Verification: Review content

- **D1.8:** commitlint + husky configured
  - Enforces conventional commit format locally
  - Helpful error message on rejection
  - Acceptance: Non-conventional commits rejected with guidance
  - Verification: Test with bad commit message

- **D1.9:** Branch protection configured
  - Require CI to pass before merge
  - Require conventional PR title
  - Require branch up-to-date with main
  - Acceptance: PRs blocked until requirements met
  - Verification: Test with failing PR

- **D1.10:** Post-publish smoke test
  - After npm publish, verify from clean environment:
    - `npm install @living-architecture/riviere-cli` works
    - `npx riviere --help` runs successfully
  - Acceptance: Fresh install works
  - Verification: Test in clean directory/CI

---

### M2: Landing page validated

Landing page exists at `apps/docs/index.md`. Validate content and links work.

#### Deliverables

- **D2.1:** Landing page builds and renders correctly
  - Verify `nx build docs` succeeds
  - Verify homepage renders without errors
  - Acceptance: Page loads, no console errors
  - Verification: Build and visual inspection

- **D2.2:** All links verified working
  - Test: Get Started link
  - Test: View Demo link (Éclair)
  - Test: GitHub link
  - Test: All internal doc links
  - Acceptance: All links resolve correctly
  - Verification: Click-test each link

- **D2.3:** Content reviewed for accuracy
  - Value proposition still accurate?
  - Package names correct?
  - Feature descriptions up to date?
  - Acceptance: Content reflects current state
  - Verification: Manual review

- **D2.4:** Hero screenshot displays correctly
  - Image loads without errors
  - Image is clear and representative
  - Acceptance: Screenshot visible and relevant
  - Verification: Visual inspection

---

### M3: Netlify deployment configured

All three apps deploy to correct paths.

#### Deliverables

- **D3.1:** Make living-architecture repo public
  - Change GitHub repo visibility to public
  - Acceptance: Repo accessible without authentication
  - Verification: Access in incognito browser

- **D3.2:** Domain registered
  - Register `living-architecture.dev`
  - Acceptance: Domain owned and DNS accessible
  - Verification: WHOIS shows ownership

- **D3.3:** Netlify project created
  - Connect to GitHub repo
  - Configure build command and publish directory
  - Acceptance: Project appears in Netlify dashboard
  - Verification: Dashboard accessible

- **D3.4:** Build configuration
  - Create `netlify.toml` at repo root
  - Configure build to produce: landing + docs + éclair
  - Acceptance: `netlify build` succeeds locally (or in CI)
  - Verification: Build output contains all three apps

- **D3.5:** Routing configured
  - `/` serves landing page
  - `/docs/*` serves documentation
  - `/eclair/*` serves visualizer
  - Acceptance: All paths resolve correctly
  - Verification: Test in preview deploy

- **D3.6:** Custom domain configured
  - Point `living-architecture.dev` DNS to Netlify
  - Enable HTTPS
  - Acceptance: Domain loads with valid certificate
  - Verification: Browser shows secure connection

---

### M4: Automated deploys work

Push to main triggers deployment.

#### Deliverables

- **D4.1:** Auto-deploy on push to main
  - Netlify builds and deploys on merge to main
  - Acceptance: Change merged → visible on production
  - Verification: Make small change, verify deployment

- **D4.2:** Preview deploys for PRs
  - Each PR gets a unique preview URL
  - Acceptance: PR comments include preview link
  - Verification: Open PR, check preview

---

### M5: Demo application extracted and viewable

The ecommerce-demo-app serves as a real-world example of extraction → visualization.

#### Deliverables

- **D5.1:** Demo app imports npm riviere packages
  - Add `@living-architecture/riviere-cli` as devDependency
  - Repository: github.com/NTCoding/ecommerce-demo-app
  - Acceptance: `npm install` works, riviere CLI available
  - Verification: `npx riviere --help` works in demo repo

- **D5.2:** Architecture extracted using riviere CLI
  - Use riviere CLI with AI-assisted extraction
  - Extract flows across all domains (orders, shipping, inventory, payments, notifications, bff, ui)
  - Generates `.riviere/` folder with graph.json
  - Include custom types where needed
  - Acceptance: Complete graph.json in .riviere/ folder
  - Verification: Graph validates successfully

- **D5.3:** Custom types defined
  - Identify components that need custom types (message queues, external integrations, etc.)
  - Define custom types in graph metadata
  - Acceptance: Custom types appear in graph with proper validation
  - Verification: Éclair renders custom types correctly

- **D5.4:** Demo viewable and works in Éclair
  - Éclair homepage shows upload page with demo graph URL pre-filled in URL input
  - Explanatory text: "Try it out: Click 'Load' to explore the ecommerce-demo-app architecture"
  - Demo graph URL: `https://raw.githubusercontent.com/NTCoding/ecommerce-demo-app/main/.riviere/graph.json`
  - User clicks Load to see the visualization
  - Link to Éclair from docs and landing page
  - Acceptance: User lands on Éclair homepage, sees pre-filled URL with explanation, clicks Load
  - Verification: Visit Éclair, verify pre-fill works and demo loads correctly

---

### M6: Documentation reviewed and polished

Documentation exists. Review for completeness and polish for launch.

#### Deliverables

- **D6.1:** Getting started guide reviewed
  - Verify installation instructions work
  - Verify extraction walkthrough is complete
  - Verify Éclair viewing instructions work
  - Acceptance: Guide is accurate and followable
  - Verification: Follow guide on fresh machine

- **D6.2:** API reference verified
  - Verify riviere-query methods documented
  - Verify riviere-builder methods documented
  - Verify CLI commands documented
  - Acceptance: All public APIs have reference docs
  - Verification: TypeDoc generates without warnings

- **D6.3:** Example graphs verified
  - Verify ecommerce-demo-app graph loads in Éclair
  - Verify links to examples work
  - Acceptance: Examples load correctly
  - Verification: Test loading each example

- **D6.4:** Documentation links updated
  - Replace placeholder URLs (`github.com/org/...`) with `github.com/ntcoding/living-architecture`
  - Update source code JSDoc examples that generate into API docs
  - Files to update: `apps/docs/reference/api/index.md`, `apps/docs/reference/cli/cli-reference.md`, `apps/docs/extract/steps/step-3-extract.md`, `packages/riviere-builder/src/builder.ts`
  - Acceptance: No placeholder URLs remain
  - Verification: `grep -r "github.com/org" apps/docs packages/` returns no results

---

### M7: Éclair UI polished

Review and polish Éclair visualizer for launch readiness.

#### Deliverables

- **D7.1:** Demo UX flow verified
  - Homepage shows upload page with demo graph URL pre-filled
  - "Load" button works to load the demo
  - Visualization renders correctly
  - Acceptance: User can load demo in 1 click
  - Verification: Test full flow from homepage

- **D7.2:** UI rough edges reviewed
  - Check for layout issues, broken styling
  - Check for console errors during use
  - Check mobile/responsive behavior
  - Acceptance: No obvious visual bugs
  - Verification: Manual testing on different screen sizes

- **D7.3:** Interactive features work
  - Domain filtering works
  - Node selection works
  - Zooming/panning works
  - Acceptance: All interactions responsive
  - Verification: Test each feature

- **D7.4:** Visual consistency check
  - Colors match brand guidelines
  - Typography consistent
  - Icons display correctly
  - Acceptance: Visually polished for launch
  - Verification: Compare against brand docs

---

## 8. Dependencies

**Depends on:**
- Phase 5 (Query) — Package must be complete
- Phase 6 (Éclair) — App must be migrated
- Phase 7 (Builder) — Package must be complete
- Phase 8 (CLI) — Package must be complete

**Blocks:**
- Phase 10 (TypeScript Extraction) — Need launched platform first
- Phase 11 (Graph Merging) — Need launched platform first
