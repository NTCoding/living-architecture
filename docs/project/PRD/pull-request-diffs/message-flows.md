# Option 1: Resolve the retained head diff from the PR

Éclair receives a repository and PR ID rather than a direct file URL. It asks GitHub for the current PR context, uses the returned head repository and commit SHA to load the retained `ArchitectureDiff`, and presents the focused review. This keeps the public link stable as the PR changes while pinning each loaded diff and its source evidence to a specific revision.

```mermaid
flowchart LR
  subgraph legend[Legend]
    direction TB
    legendActor(["👤<br/>Actor"])
    legendApp[["App"]]
    legendSubdomain(["Subdomain"])
    legendSystem{{"External system"}}
    legendCommand["Command"]
    legendEvent["Event"]
    legendQuery["Query"]
  end

  subgraph scenario["Scenario: Review a public PR architecture diff in Éclair"]
    direction LR

    reviewer(["👤<br/><b>PR reviewer</b>"])
    eclair[["Éclair"]]
    github{{"GitHub"}}

    m1["1 · View PR"]
    m2["2 · Open architecture review"]
    m3["3 · Get PR context"]
    m4["4 · Get architecture diff"]
    m5["5 · View source evidence"]

    reviewer --> m1 --> github
    reviewer --> m2 --> eclair
    eclair --> m3 --> github
    eclair --> m4 --> github
    reviewer --> m5 --> github
  end

  classDef actor fill:#ffffff,stroke:#374151,color:#111827,stroke-width:2px,font-size:18px;
  classDef app fill:#ccfbf1,stroke:#0f766e,color:#134e4a,stroke-width:4px,font-size:20px;
  classDef subdomain fill:#ddd6fe,stroke:#7c3aed,color:#2e1065,stroke-width:4px,font-size:20px;
  classDef system fill:#f3f4f6,stroke:#374151,color:#111827,stroke-width:3px,font-size:18px;
  classDef command fill:#7dd3fc,stroke:#0369a1,color:#082f49,stroke-width:2px,font-size:13px;
  classDef event fill:#fdba74,stroke:#c2410c,color:#431407,stroke-width:2px,font-size:13px;
  classDef query fill:#d9f99d,stroke:#4d7c0f,color:#1a2e05,stroke-width:2px,font-size:13px;

  class reviewer,legendActor actor;
  class eclair,legendApp app;
  class legendSubdomain subdomain;
  class github,legendSystem system;
  class legendCommand command;
  class legendEvent event;
  class m1,m2,m3,m4,m5,legendQuery query;
```

## Message details

| # | Type | Message | Sender → recipient | Significant data |
| ---: | --- | --- | --- | --- |
| 1 | Query | View PR | PR reviewer → GitHub | Request: repository and PR ID. Response: PR page and architecture review link. |
| 2 | Query | Open architecture review | PR reviewer → Éclair | Request: repository and PR ID. Response after messages 3 and 4: focused architecture review. |
| 3 | Query | Get PR context | Éclair → GitHub | Request: repository and PR ID. Response: title, description, PR link, head repository, and head commit SHA. |
| 4 | Query | Get architecture diff | Éclair → GitHub | Request: head repository, head commit SHA, and `.riviere/pr-diffs/riviere-architecture-diff.json`. Response: `ArchitectureDiff` JSON. |
| 5 | Query | View source evidence | PR reviewer → GitHub | Request: repository, base or head revision, file path, and source lines. Response: source code at that revision. |

## Pros

- The link needs only the repository and PR ID, so it remains usable when the PR head changes.
- Resolving `head.repo.full_name` supports PRs raised from forks.
- Loading the diff from the returned head commit SHA avoids following a moving branch during one review load.
- Éclair obtains current public PR context without requiring its own backend.
- The reviewer can move from architecture changes to source evidence at the relevant revision.

## Cons

- This flow works only for public repositories; private repositories need the separate upload flow.
- The retained diff must already exist at the conventional path in the PR head commit.
- Reopening the same link resolves the PR's current head rather than preserving an earlier comparison.
- The loading failure behaviour remains unresolved when PR metadata or the retained diff cannot be fetched or validated.
- Diff generation timing and the process that puts the retained diff into the head commit remain unresolved outside this option.
