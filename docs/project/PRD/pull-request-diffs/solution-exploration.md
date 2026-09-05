# Solution Exploration: Pull Request Architecture Diffs

**Status:** Approved

---

## 1. Problem anchor

AI agents are doing much of the implementation work, while key architecture and domain model changes can remain hidden among hundreds of lines of code. Developers and maintainers reviewing pull requests may therefore miss important decisions before merge, allowing architecture mistakes to pass unnoticed and become difficult to correct later.

The same visibility problem affects principal engineers and architects who need to understand how architecture evolved across a longer period. A working architecture diff proof of concept exists, but it is an isolated TypeScript-specific script which nobody except its creator can use.

## 2. Research scope and sources

The approved research covered the existing Rivière proof of concept, a real pull request with a substantial domain model change, Éclair's current visual language, GitHub review conventions, semantic code diff tools, affected-project tools, architecture visualisation tools, and architecture policy tools.

The research was used to find a review experience which preserves the complete architecture evidence while making important changes visible at a glance. It was not used to replace the full GitHub code diff or to automate architectural judgement.

| Source | Type | Why included | Accepted finding |
| --- | --- | --- | --- |
| [Pull request #478](https://github.com/NTCoding/living-architecture/pull/478) and its [architecture diff](https://github.com/NTCoding/living-architecture/pull/478#issuecomment-5454459810) | internal proof of concept | A real, large domain model change with complete architecture evidence | The generated diff is the authoritative inventory and already provides a useful subdomain, layer, change direction, and element hierarchy. Its complete evidence must be preserved. |
| `.github/workflows/pr-architecture-review.yml` | internal proof of concept | Existing automated pull request delivery | Rivière can compare base and head workspaces and update one pull request comment without requiring the proposed website. |
| `tools/living-documentation/src/features/documentation/entrypoint/generate-pr-architecture-diff/` | internal proof of concept | Existing summary and disclosure conventions | The GitHub formatter provides the baseline summary pattern and groups entry points and use cases around their primary architectural element. |
| `apps/eclair/src/features/comparison/`, `apps/eclair/src/features/overview/`, and `apps/eclair/src/features/modules/` | internal product source | Existing Rivière comparison and disclosure patterns | The visual experience should use Éclair's Stream shell, typography, colour variables, summary treatment, and visible disclosures rather than introducing a generic dashboard style. |
| [GitHub pull request review documentation](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests) | comparable product | The review environment users already understand | Keep the full code diff in GitHub and use familiar added and removed colours, compact tables, revision-specific links, and progressive disclosure. |
| [SemanticDiff](https://semanticdiff.com/) | comparable product | A semantic approach to code review | Semantic presentation can reduce review noise, but code structure alone does not explain the Rivière domain and architecture model. |
| [Difftastic](https://difftastic.wilfred.me.uk/) | open-source tool | Syntax-aware diff comparison | Structural diffing can improve readability, but it remains a code diff rather than a subdomain and domain model review. |
| [Nx affected](https://nx.dev/ci/features/affected) | framework | Affected-project scoping | Affected scope is useful context, but project impact alone does not show changed aggregates, use cases, published language, or exact architecture evidence. |
| [Structurizr](https://structurizr.com/) | comparable architecture tool | Model-based architecture visualisation | Architecture models provide useful context, but a general model view is not a substitute for a focused pull request change review. |
| [ArchUnit](https://www.archunit.org/) | open-source architecture tool | Architecture policy enforcement | Automated rules can prevent known violations, but they complement rather than replace human review of domain model evolution. |

## 3. Existing solution research

The pull request #478 architecture report contains 316 architecture element rows across three subdomains and seven layer sections, plus aggregate and method changes. It proves that a complete architecture inventory can be generated from code. It also shows the limits of a long Markdown report: package changes, affected aggregates, public contracts, and the shape of each use case can require substantial scanning.

The current GitHub formatter improves that baseline with a summary grouped by subdomain, collapsible subdomains, and named command and query use case disclosures. These conventions are useful and should be carried into the visual experience rather than replaced by a new information hierarchy.

Éclair already provides the appropriate Rivière identity. Its Stream theme uses teal as the primary colour, Rubik headings, Lato body copy, Fira Code for code, restrained bordered surfaces, and clear disclosure controls. The approved visual direction uses that application shell while retaining conventional green additions, red removals, compact tables, and direct code links familiar from GitHub and IDE diffs.

The comparable products each solve only part of the problem. SemanticDiff and Difftastic improve code-level change readability. Nx identifies affected projects. Structurizr presents architecture models. ArchUnit enforces known architecture rules. None of these replaces a complete Rivière graph diff organised around applications, subdomains, packages, use cases, aggregates, and source evidence.

## 4. Candidate approaches

### Option A: Keep the generated GitHub architecture diff only

- Concept: Generalise the existing generator but keep the complete review experience in a GitHub comment.
- Who it helps: Reviewers who want all evidence in the pull request and do not want another surface.
- User change: Reviewers receive a reusable Rivière diff, but continue navigating a long Markdown report.
- Relevant research: Pull request #478 and the current GitHub formatter prove this delivery path works.
- Trade-off: It has the fewest operational dependencies, but important package, aggregate, and public contract changes can still be difficult to see quickly.
- Risk: A complete report can remain technically correct while still failing the approved need for key changes to “jump out”.

### Option B: Replace the GitHub architecture diff with a website

- Concept: Publish the architecture comparison only as an interactive Éclair page linked from the pull request.
- Who it helps: Reviewers who prefer a dedicated, interactive architecture experience.
- User change: Reviewers leave GitHub to understand every architecture change.
- Relevant research: Éclair proves that Rivière information can be presented interactively.
- Trade-off: It gives maximum visual freedom, but makes the review dependent on a second system and removes the complete GitHub fallback.
- Risk: Website availability, access, or link failure could hide the architecture evidence or prevent a dependable review flow.

### Option C: Add an Éclair review experience to the complete GitHub diff

- Concept: Generate a reusable Rivière graph diff, keep its complete GitHub representation, and add a focused Éclair page for scanning, navigation, and source evidence.
- Who it helps: Pull request reviewers, maintainers, principal engineers, and architects who need both immediate review context and a clearer architecture view.
- User change: Reviewers start with a concise architecture summary, open only the application, subdomain, package, use case, aggregate, or element evidence they need, and retain the complete GitHub diff as the baseline.
- Relevant research: Combines the proven GitHub formatter hierarchy, Éclair's established design language, and familiar diff conventions without turning the page into another general architecture dashboard.
- Trade-off: The product has two complementary representations which must stay consistent.
- Risk: If the visual view drops facts, misstates ownership, or invents a different hierarchy, it becomes less trustworthy than the GitHub report.

## 5. Selected product concept

**Concept approval:** Approved

Create a reusable Rivière pull request architecture comparison which keeps the complete generated GitHub architecture diff and supplements it with an Éclair review page.

The experience is designed to help a reviewer answer three questions:

1. What architecture changed?
2. Has the change damaged the domain model?
3. What code proves it?

The Éclair page begins with real pull request context. It shows one link identifying the repository and pull request, the real pull request title, and a pull request description which is collapsed by default.

A global summary follows the GitHub diff convention. It keeps concise headline totals for changed subdomains, changed packages, and affected aggregates. Beneath those totals, one table is grouped by subdomain with columns for status, affected aggregates, additions, and removals. Each subdomain row names its affected aggregates and shows changes inside its `use-cases`, `domain-model`, and `published-language` packages where present. Published language remains immediately visible because it is a contract exposed to other subdomains. The headline numbers remain concise; their detail belongs in the table below.

Ownership must be represented honestly. Applications aggregate subdomain use cases, while subdomains own their packages. In the approved example, the CLI entry points live under `apps/cli`, not inside either `riviere-builder` or `riviere-extract-ts`. Matching base and head records are therefore shown as an application-level subdomain association change, with 13 collapsible CLI entry points and their 21 supporting application elements. A future API entry point may appear inside a subdomain when the Rivière model identifies that entry point as owned by the subdomain.

Detailed subdomain content follows the generated diff rather than inventing another story:

- subdomain
- architecture layer
- added or removed
- package, use case, aggregate, or element evidence

Use cases are separated into command and query use cases. Each named use case is independently collapsible and contains its related inputs, results, models, loaders, repositories, errors, or other supporting elements. Changes which do not belong to one named use case remain in a clearly named supporting group.

Domain changes are grouped by package. Every package is an independently collapsible disclosure, closed by default, with its change count visible in the package row. This allows reviewers to move between `published-language` and `domain-model` without scrolling through every element in the preceding package.

Aggregates clearly separate Name, Role, Package, and Code. Aggregate entity and method collections are collapsed by default. When opened, methods use a vertical list with one readable, non-wrapping method per line.

Every architecture element available in the generated diff remains reviewable. Important application, use case, aggregate, entity, method, published language, and domain model elements link to exact source lines at the relevant base or head revision. Application reassignment evidence provides both base and head code links.

The page uses the Éclair Stream visual language, with teal as the product identity. Diff content uses restrained surfaces, visible carets, monospace code, and conventional red and green change colours. Information-heavy sections remain vertically stacked and responsive rather than compressed into competing horizontal panels.

Rivière exposes changes and evidence. It does not make an AI judgement about whether the architecture is good or bad. The reviewer owns that decision.

The approved visual baseline is:

`docs/project/PRD/pull-request-diffs/prototypes/architecture-diff-visual-mockups.html`

The baseline may evolve, but its approved content hierarchy, ownership distinctions, evidence completeness, and review readability should be preserved unless later product discovery changes them.

## 6. Product paths

### Happy path

1. A pull request is opened or updated.
2. Rivière compares the base and head graph states and generates the complete architecture diff.
3. The repository's workflow publishes or updates the complete GitHub architecture diff and provides access to the Éclair review experience.
4. The reviewer sees the real repository, pull request, title, and concise headline totals.
5. The reviewer scans the subdomain-grouped summary for changed packages, published language contracts, and named affected aggregates.
6. The reviewer opens application changes separately from subdomain package changes.
7. The reviewer opens only the relevant subdomain, architecture layer, change direction, package, use case, aggregate, or supporting group.
8. The reviewer follows exact base or head source links to inspect the code which proves each important architecture fact.
9. The reviewer uses the complete GitHub code diff for the full implementation review and decides whether the pull request should be merged.

### Unhappy paths

- The Éclair page is unavailable -> the complete generated GitHub architecture diff remains available; website failure must not prevent GitHub diff generation.
- The architecture comparison is very large -> subdomains remain readable and information-heavy layers, packages, use cases, aggregates, and method groups use independent progressive disclosure.
- A published language package changes -> the package remains visible in the global subdomain summary before the reviewer opens detailed layers.
- A package contains many changed elements -> the package is collapsed by default so the next changed package remains reachable without scrolling through the first package.
- A use case contains many related elements -> the named use case is collapsed independently and expands to show its related architecture evidence.
- Application entry points change their subdomain association -> they remain under their actual application owner and show the association change with base and head evidence rather than appearing as subdomain-owned packages.
- A future API entry point is genuinely owned by a subdomain -> it may appear within that subdomain when the Rivière model provides that ownership evidence.
- An aggregate changes on both sides of the comparison -> the summary names it as affected, while the Domain detail shows its added and removed members without pretending that the aggregate itself was both created and deleted.
- The pull request description is long -> it remains available but collapsed by default so it does not dominate the architecture review.
- Architecture diff generation fails -> each repository controls whether that failure blocks merging; the website does not impose a central merge policy.

## 7. No-gos and exclusions

- No replacement of the complete GitHub code or architecture diff.
- No requirement for the website to be available before the GitHub architecture diff can be generated.
- No central decision that architecture diff failures must block every repository; each repository owns its CI and merge policy.
- No TypeScript-specific product model. Comparison is based on Rivière graph states even when a language-specific extractor produced them.
- No dropped, summarised-away, or hidden architecture facts from the authoritative generated diff.
- No AI verdict, architecture score, speculative warning, or claim that a change is safe or unsafe.
- No presentation of application-owned CLI entry points as packages inside a subdomain.
- No assumption that every entry point belongs to an application; a subdomain-owned API entry point remains possible when supported by model evidence.
- No package-global summary which loses the subdomain grouping used by the GitHub diff.
- No burying published language several disclosure levels below the initial summary.
- No long package body which must be scrolled before the next package becomes visible.
- No horizontally competing information-heavy sections.
- No compressed aggregate methods, wrapped multi-method lines, or ambiguous aggregate headings.
- No generic GitHub imitation which discards Éclair's actual visual conventions.
- No dominant purple treatment, decorative card grid, gradient-filled diff body, tiny text, or pill-heavy presentation.
- No fake controls, dead links, repeated equivalent views, or actions which do not work.
- No implementation or formatting mechanics presented as evidence that the review experience is usable.

## 8. Risk review

| Risk | Confidence | Evidence / reason | Open concern | Mitigation / next step |
| --- | --- | --- | --- | --- |
| Value | Medium | The selected concept directly addresses the approved need for key architecture and domain model changes to “jump out”. It was shaped against a real 316-row architecture diff and the visual baseline was explicitly approved as solid in style and content. | Approval comes from this planning and review session rather than broader use across several repositories and reviewer roles. | Use the approved PR #478 example as the first dogfood case and retain the complete GitHub fallback while gathering real review feedback. |
| Usability | Medium | Repeated visual review produced an approved hierarchy: concise global facts, subdomain-grouped summary, separate applications, named aggregates, collapsed packages, and collapsible named use cases. Desktop and mobile browser checks found no page overflow or browser errors. | A static prototype does not prove that reviewers can navigate very large generated diffs quickly in normal pull request work. | Carry the approved hierarchy into the PRD and require dogfooding with a real generated diff before treating the experience as complete. |
| Feasibility | Medium | The repository already compares base and head workspaces, produces a complete GitHub comment, contains Éclair comparison and disclosure components, and exposes revision-specific source locations. The prototype preserves and links the PR #478 evidence. | The reusable graph representation must distinguish application ownership from subdomain exposure and must provide enough repository metadata for exact base and head links. | Keep the product ownership rule explicit in the PRD, then resolve graph representation, source metadata, hosting, and failure isolation during architecture definition. |
| Business viability | Medium | The additive design preserves existing GitHub review, lets each repository control CI policy, and prevents website availability from becoming a merge dependency. | Hosting, access, retention, and operational ownership of generated comparison pages still need an implementation decision. | Treat independent GitHub generation and repository-controlled enforcement as fixed product constraints; decide deployment and access in architecture planning. |

## 9. Risky assumptions

- Rivière graph comparisons can provide every architecture fact needed for the general experience without falling back to TypeScript-specific concepts.
- The comparison input can distinguish an application-owned entry point from a subdomain-owned API entry point.
- Application association changes can be recognised without misrepresenting identical base and head application elements as newly created or deleted.
- Package changes can be grouped consistently under their owning subdomain as `use-cases`, `domain-model`, or `published-language`.
- A concise summary plus progressive disclosure is enough for reviewers to find important changes without losing confidence in completeness.
- Published language is a meaningful public contract signal for reviewers across subdomains, while Rivière should still avoid declaring the change breaking without proof.
- Revision-specific repository metadata and source locations will be available for direct evidence links.
- The visual experience and complete GitHub report can remain consistent as the underlying graph and supported architecture concepts evolve.
- The approved PR #478 fixture is representative enough to shape the initial product concept, even though broader repository dogfooding is still needed.

## 10. Rejected options

- GitHub-only architecture review as the complete product direction: retained as the authoritative fallback, but rejected as the only experience because important package, aggregate, and public contract changes remain difficult to scan in a large report.
- Website-only architecture review: rejected because website availability or access must not remove the complete architecture evidence from GitHub.
- TypeScript-specific diff product: rejected because Rivière's graph is language agnostic and the current isolated script is part of the approved problem.
- Package-global summary: rejected because it removes the GitHub diff's subdomain-first context. Package changes belong inside each subdomain summary row.
- Application entry points nested inside subdomain packages: rejected because current CLI entry points live in `apps/cli`. Their relationship to subdomain use cases must not be mistaken for containment or ownership.
- Flat Use cases tables: rejected because the GitHub formatter already provides a clearer named use case disclosure pattern.
- Permanently expanded package sections: rejected because one large package can force reviewers to scroll past all of its elements before reaching the next package.
- Graph-first or dashboard-first review: rejected because the primary task is understanding a concrete pull request change and its code evidence, not exploring the whole current architecture.
- AI architecture verdict: rejected because Rivière should expose evidence and leave architectural judgement to the reviewer.

## 11. Open discovery questions

No open product discovery questions. The approved product concept is ready to be recorded in a PRD. Representation of application ownership, source metadata, deployment, access, and failure isolation remain architecture concerns for the later architecture stage.
