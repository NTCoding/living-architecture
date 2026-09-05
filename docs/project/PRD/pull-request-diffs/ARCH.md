# Architecture: Pull Request Architecture Diffs

**Status:** Draft

---

## 1. Product feasibility check

**Decision status:** Approved

Feasibility remains plausible at architecture depth. The revised product concept and PRD are approved, so architecture drafting can continue.

The repository contains a throwaway TypeScript proof of concept for a GitHub architecture diff and a separate, half finished graph comparison built into the Éclair UI. Neither is the intended foundation for the approved product. Rivière needs one reusable architecture diff capability, decoupled from any UI. GitHub and Éclair consume the same generated `ArchitectureDiff` while providing tailored experiences.

Architecture discovery established two independently named and retained workflow outputs. The `high-level graph` remains selective and shows flows and key concepts for exploration or other purposes. The `fine-grained-role-graph` maps every role annotated class and method together with the ownership, relationships, package information, and source evidence required by the architecture diff.

The completed representation prototype proves that a valid Rivière graph can reproduce the existing pull request #478 architecture diff. It does not prove direct workflow extraction because it creates graph fixtures from the disposable TypeScript architecture snapshots. The user accepted this remaining uncertainty and decided that direct workflow generation, exact parity, and performance validation will be the first delivery ticket.

## 2. Ownership and boundaries

**Decision status:** Partially approved

### Approved subdomain direction

**`riviere-architecture` provides architectural insights based on Rivière graphs and other Rivière concepts.** Architecture comparison is one capability within this subdomain. It may also use Rivière roles directly or concepts introduced later, where justified by a specific insight. Neither those dependencies nor the relocation of existing Builder or Query capabilities has been decided.

### Approved package and consumer responsibilities

The responsibility split follows ADR-002:

| Location | Responsibility |
| --- | --- |
| `packages/riviere-architecture/domain-model` | Architectural interpretation and comparison rules. |
| `packages/riviere-architecture/use-cases` | Expose architecture comparison to callers, including loading its inputs. |
| `packages/riviere-architecture/published-language` | Define the shared `ArchitectureDiff` contract, using Rivière published-language types where it returns graph elements. |
| `apps/cli` | Expose comparison through the Rivière CLI and format the GitHub output. |
| `apps/eclair` | Present the generated diff as the approved review page. |

TypeScript extraction remains outside `riviere-architecture`. This split does not approve moving existing Query capabilities or introducing a direct dependency on Rivière roles.

### Approved viewer hosting and diff file convention

The review page uses the existing Éclair deployment at `https://living-architecture.dev/eclair/`. For public repositories, the reviewer clicks a link to view the diff in Éclair without downloading or selecting a file. Private repositories use file upload as described below.

The generated `ArchitectureDiff` is stored in one tracked file under the existing `.riviere` directory:

```text
.riviere/pr-diffs/riviere-architecture-diff.json
```

The file contains the architecture diff for the current commit. Users access an older diff by going back to the corresponding Git commit. There are no per-pull-request or commit-pair directories and no separate reports branch.

The GitHub Action builds the GitHub report from the existing JSON file. It does not calculate the architecture diff.

### Approved pull request identity and diff resolution

The Éclair link uses `pr-diff` to identify a repository and pull request ID, not a caller-supplied JSON URL. The tracked diff path above is a convention for the GitHub integration, not merely this repository's local storage choice.

For public repositories, Éclair resolves the diff as follows:

1. Fetch pull request metadata from `https://api.github.com/repos/{owner}/{repository}/pulls/{pullRequestId}`.
2. Use the returned `head.repo.full_name` and `head.sha` to generate `https://raw.githubusercontent.com/{head.repo.full_name}/{head.sha}/.riviere/pr-diffs/riviere-architecture-diff.json`.
3. Load and validate the generated `ArchitectureDiff` for presentation.

For pull request #478, the metadata URL is `https://api.github.com/repos/NTCoding/living-architecture/pulls/478`. The raw file URL uses the actual head repository and commit SHA returned by that request. Using the head repository accommodates forks; pinning the file request to the returned SHA avoids following a moving branch during loading. Reopening the link resolves the pull request's current head again.

The exact encoding of repository and pull request ID in the Éclair URL remains to be specified. Loading failure behaviour remains unresolved. Generation timing is a separate repository adoption decision and remains undecided.

### Approved private repository file upload

Private repositories use diff file upload instead of authenticated GitHub loading. Éclair has no backend; uploaded files are processed in the browser.

The uploaded file must contain the extra GitHub metadata unavailable in this mode, including the pull request title, description, repository and pull request link, and revision-specific source links. The review must not depend on fetching private GitHub metadata. The exact file contract and the mechanism for supplying this metadata during generation remain to be designed.

Private repository support is included through upload, not excluded or deferred. This qualifies the previously recorded link-based review path. The user approved revising the PRD and solution exploration to distinguish public GitHub loading from private file upload. Both documents now include that distinction; the revised PRD awaits review before architecture resumes.

## 3. Component design

**Decision status:** Pending

## 4. Feasibility confirmations

**Decision status:** Pending

## 5. Product impact notes

Architecture discovery added requirements for separate `high-level graph` and `fine-grained-role-graph` workflow outputs, retained graph output, and measured performance. The approved review experience remains unchanged. These requirements are now approved in the revised PRD.

## 6. Task generation consequences

**Decision status:** Partially confirmed

The first delivery ticket must directly generate the `fine-grained-role-graph` through a Rivière workflow without using the disposable architecture snapshot as an intermediate. It must reproduce the pull request #478 architecture diff exactly and report elapsed time, peak memory, and generated graph size. Later delivery work must not rely on the direct extraction path until this validation passes.
