# PRD: Pull Request Architecture Diffs

**Status:** Approved

**PRD approval:** Approved

**Approval note:** The approved review experience remains unchanged. Reapproval confirms two independently generated Rivière graph outputs, the `fine-grained-role-graph` as the architecture diff source, retained outputs, and performance validation in the first delivery ticket.

---

## 1. Problem Summary

AI agents are doing much of the implementation work, while key architecture and domain model changes can remain hidden among hundreds of lines of code. Developers and maintainers reviewing pull requests may therefore miss important decisions before merge, allowing architecture mistakes to pass unnoticed and become difficult to correct later.

The same visibility problem affects principal engineers and architects who need to understand how architecture evolved across a longer period. A working architecture diff proof of concept exists, but it is an isolated TypeScript-specific script which nobody except its creator can use.

## 2. Product Decision

Create a reusable Rivière pull request architecture comparison which keeps the complete generated GitHub architecture diff and supplements it with an Éclair review page.

Repositories generate two retained Rivière graphs through independently named workflows:

- the **high-level graph**, which selectively shows flows and key concepts for exploration in Éclair or any other purpose;
- the **fine-grained-role-graph**, which maps every role annotated class and method together with the ownership, relationships, package information, and source evidence required by the architecture diff.

The architecture diff compares base and head `fine-grained-role-graph` states. GitHub and Éclair consume the same generated `ArchitectureDiff`; they may present it differently while preserving complete and consistent facts. The pull request does not show a second diff of the `high-level graph`.

The experience helps a reviewer answer three questions:

1. What architecture changed?
2. Has the change damaged the domain model?
3. What code proves it?

Rivière exposes changes and evidence. It does not judge whether the architecture is good or bad. The reviewer owns that decision.

## 3. Users and Use Cases

- Developers and maintainers reviewing changes made by AI agents: identify important architecture and domain model changes before deciding whether a pull request should be merged.
- Principal engineers and architects: compare Rivière graph states to understand how architecture evolved across a longer period.
- Pull request reviewers: move from a concise summary to the relevant application, subdomain, package, use case, aggregate, element, and exact source evidence without losing access to the complete diff.

## 4. Product Requirements

- A repository must be able to run two independently named workflows which generate and retain separate valid Rivière graph outputs.
- The `high-level graph` must remain selective. It shows flows and key concepts for exploration in Éclair or any other purpose rather than including every role annotated declaration.
- The `fine-grained-role-graph` must include every role annotated class and method, plus the ownership, relationships, package information, and source evidence required to preserve the complete existing architecture diff.
- “Fine grained” does not mean every source symbol. Unannotated implementation details which provide no required architecture diff fact are not part of this requirement.
- The architecture diff must compare base and head `fine-grained-role-graph` states without making the product model TypeScript specific.
- The pull request must continue to present one architecture diff. It must not add a separate diff of the `high-level graph`.
- GitHub and Éclair must consume the same generated `ArchitectureDiff`, while retaining their approved presentation differences.
- The `fine-grained-role-graph` must be retained as a normal workflow output for now. Future direct exploration of it in Éclair remains possible but is not required by this PRD.
- Architecture diff generation approaches must be compared using exact output equivalence, elapsed time, peak memory, and generated input size. The selected approach must preserve the complete existing diff output and avoid unnecessary graph generation work.
- A pull request comparison must retain the complete generated GitHub architecture diff and provide access to a focused Éclair review page.
- GitHub architecture diff generation must not depend on the Éclair page being available.
- The Éclair page must show the repository and pull request link, the real pull request title, and a pull request description which is collapsed by default.
- The page must show concise totals for changed subdomains, changed packages, and affected aggregates.
- A summary table must group changes by subdomain and show status, named affected aggregates, additions, removals, and changes within `use-cases`, `domain-model`, and `published-language` packages where present.
- Published language changes must be visible in the initial subdomain summary because they expose contracts to other subdomains.
- Application-owned elements must remain under their application owner. Changes in their association with subdomains must not be presented as subdomain package ownership.
- Entry points which the Rivière model identifies as genuinely owned by a subdomain must be allowed to appear within that subdomain.
- Detailed evidence must follow this hierarchy where applicable: subdomain, architecture layer, change direction, then package, use case, aggregate, or supporting element group.
- Command and query use cases must be distinct. Each named use case must be independently collapsible with its related inputs, results, models, loaders, repositories, errors, and other supporting elements. Changes outside a named use case must remain in a clearly named supporting group.
- Domain changes must be grouped by package. Each package must be independently collapsible, closed by default, and show its change count before expansion.
- Aggregates must clearly separate Name, Role, Package, and Code. Their entity and method collections must be collapsed by default. Expanded methods must appear as one readable, non-wrapping method per line.
- Every architecture element in the generated diff must remain reviewable. Important application, use case, aggregate, entity, method, published language, and domain model elements must link to exact source lines at the relevant base or head revision.
- Application association changes must provide both base and head source evidence.
- An aggregate changed on both sides of a comparison must be named as affected in the summary, while its detailed view distinguishes added and removed members without presenting the aggregate itself as both created and deleted.
- Large comparisons must remain navigable through independent progressive disclosure for subdomains, layers, packages, use cases, aggregates, and method groups.
- The page must use the Éclair Stream visual language and teal product identity, with restrained surfaces, visible carets, monospace code, and conventional red and green change colours.
- Information-heavy sections must remain vertically stacked and responsive rather than being compressed into competing horizontal panels.
- The complete GitHub representation and Éclair representation must remain consistent as Rivière graph concepts evolve.
- Each repository must retain control over whether architecture diff generation failures block merging.
- The approved visual baseline is `prototypes/architecture-diff-visual-mockups.html`. Its content hierarchy, ownership distinctions, evidence completeness, and review readability must be preserved unless later product discovery changes them.

## 5. Non-Goals

- Replacing the complete GitHub code diff or generated architecture diff.
- Making Éclair availability a prerequisite for GitHub architecture diff generation.
- Imposing one central merge policy on every repository.
- Creating a TypeScript-specific product model.
- Dropping, summarising away, or hiding facts from the authoritative generated diff.
- Producing an AI verdict, architecture score, speculative warning, or claim that a change is safe or unsafe.
- Presenting application-owned CLI entry points as packages inside a subdomain, or assuming every entry point belongs to an application.
- Using a package-global summary which loses subdomain context or burying published language several disclosure levels below the summary.
- Using flat use case tables, permanently expanded package bodies, long package sections which obscure later packages, or ambiguous and compressed aggregate method presentations.
- Turning the review into a graph-first or dashboard-first exploration experience.
- Imitating GitHub at the expense of Éclair's visual conventions, or using dominant purple styling, decorative card grids, gradient-filled diff bodies, tiny text, or excessive pills.
- Providing fake controls, dead links, repeated equivalent views, or actions which do not work.
- Treating implementation or formatting mechanics as proof that the review experience is usable.
- Expanding the `high-level graph` to include every role annotated declaration.
- Including every unannotated source symbol in the `fine-grained-role-graph`.
- Showing a second pull request diff for the `high-level graph`.
- Requiring direct exploration of the `fine-grained-role-graph` in Éclair in the current scope.

Possible future exploration of the `fine-grained-role-graph` in Éclair does not add a current product requirement.

## 6. Success Criteria

- In a real pull request review, reviewers can identify what architecture changed, assess whether the change damaged the domain model, and reach the exact code evidence.
- Key package, aggregate, published language, application association, use case, and domain model changes are visible without scanning the complete raw architecture inventory.
- Every architecture fact in the generated diff remains available for review in both the complete GitHub baseline and the consistent Éclair representation.
- Reviewers can navigate a large generated comparison by opening only the relevant levels and groups.
- If the Éclair page is unavailable, reviewers can still use the complete generated GitHub architecture diff.
- Dogfooding with the real pull request #478 generated diff confirms that the approved hierarchy remains readable and usable with a substantial domain model change.
- A `fine-grained-role-graph` generated for the base and head of pull request #478 reproduces the existing architecture diff facts and published output.
- The first delivery validation directly generates the `fine-grained-role-graph` through a Rivière workflow, reproduces pull request #478 exactly, and records elapsed time, peak memory, and generated input size before later delivery work relies on that path.
- The retained `high-level graph` remains selective and useful independently of the architecture diff.

## 7. Open Product Questions

No open product questions. Direct exploration of the `fine-grained-role-graph` in Éclair may be considered later, but it is not required now.

## 8. Architecture Questions

- How should the two independently named workflows generate and retain the `high-level graph` and `fine-grained-role-graph`?
- How should the first delivery ticket validate direct `fine-grained-role-graph` workflow extraction, exact pull request #478 parity, and performance before later delivery work relies on that path?
- How should the reusable Rivière graph comparison represent application ownership, subdomain ownership, and changes in associations without inventing containment?
- What repository and revision metadata must the comparison carry so base and head evidence can link to exact source lines?
- How should the complete GitHub representation and Éclair representation be generated from consistent comparison facts?
- How should generated comparison pages be deployed, accessed, retained, and operationally owned?
- How should Éclair failures be isolated so they cannot prevent generation of the complete GitHub architecture diff?

## 9. Source Traceability

- Problem definition: `problem-definition.md`
- Solution exploration: `solution-exploration.md`
- Graph representation and performance evidence: `prototypes/README.md` and `prototypes/results/`
- Key source sections:
  - Problem definition: Approved inputs; Problem statement
  - Solution exploration: Existing solution research; Selected product concept; Product paths; No-gos and exclusions; Risk review; Risky assumptions; Open discovery questions
  - Approved visual baseline: `prototypes/architecture-diff-visual-mockups.html`
