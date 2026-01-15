# PRD: Phase 13 — Extraction Workflows

**Status:** Not Started

**Depends on:** Phase 12 (Connection Detection)

---

## 1. Problem

Today, extracting architecture requires users to:
1. Configure extraction rules (Phase 11)
2. Run extraction commands manually
3. Combine data from multiple sources (code, EventCatalog, AsyncAPI, etc.)
4. Handle errors and fill gaps
5. Re-run when code changes

This is manual, error-prone, and not CI-friendly. Users want to:
- Define a workflow once
- Run it with a single command
- Get a complete Riviere graph
- Integrate into CI/CD pipelines

---

## 2. Design Principles

TBD — Extensive research needed on workflow orchestration tools.

**Emerging principles:**

### 2.1 Sources of Truth First

**If a source of truth exists, use it.** Don't analyze code when a spec already describes the architecture.

| Priority | Source | Example |
|----------|--------|---------|
| 1 | Existing specs | AsyncAPI, OpenAPI, EventCatalog |
| 2 | Code with conventions | Golden Path extraction (Phase 12) |
| 3 | Code with patterns | Configurable extraction (Phase 12) |
| 4 | AI discovery | Fill gaps, generate suggestions |

Teams that maintain AsyncAPI specs for their events shouldn't need to configure event extraction rules — we just read the spec.

### 2.2 Other Principles

1. **Declarative workflows** — User describes what they want, not how to do it
2. **Composable steps** — Combine code extraction, AI, external tools
3. **Incremental learning** — When user fixes something, it's fixed forever
4. **CI-first** — Workflows must run in CI without human intervention
5. **Minimal configuration** — Sensible defaults, explicit only when needed

---

## 3. What We're Building

TBD — To be defined during discovery.

**Initial ideas:**

### 3.1 Workflow Definition Format

```yaml
# riviere-workflow.yaml
name: ecommerce-extraction
version: 1.0.0

steps:
  - name: extract-components
    type: riviere-extract
    config: ./riviere-config.yaml

  - name: import-event-catalog
    type: eventcatalog-import
    source: ./eventcatalog

  - name: fill-gaps
    type: ai-discovery
    model: claude-sonnet
    confidence-threshold: 0.8

  - name: merge
    type: aggregate
    inputs: [extract-components, import-event-catalog, fill-gaps]

  - name: validate
    type: schema-validate
    input: merge

output:
  format: riviere-schema
  path: ./architecture.json
```

### 3.2 Built-in Integrations (Sources of Truth)

When teams already maintain architecture specs, we consume them directly — no code analysis needed.

| Integration | What We Import | Components | Connections |
|-------------|----------------|------------|-------------|
| **EventCatalog** | Events, services, domains | Events, EventHandlers, Services | Producer → Event → Consumer |
| **AsyncAPI** | Channels, messages, operations | Events, EventHandlers | Channel subscriptions |
| **OpenAPI** | Endpoints, methods, schemas | API components | — (no connection data) |
| **GraphQL Schema** | Queries, mutations, types | API (GraphQL) components | — (no connection data) |
| **Protobuf/gRPC** | Services, methods | API (gRPC) components | — (no connection data) |
| **Backstage Catalog** | Services, ownership, metadata | Service metadata enrichment | Depends on annotations |

**Priority:** EventCatalog and AsyncAPI are highest value — they contain **connection data** (who publishes/consumes what). OpenAPI/GraphQL/Protobuf provide component data but not connections.

**Custom scripts** — Bash/Node scripts for bespoke extraction from proprietary tools

### 3.3 AI Integration

- Fill gaps when deterministic extraction fails
- Generate suggested config when patterns are unclear
- Review and confidence scoring

### 3.4 CI Integration

```yaml
# GitHub Actions example
- name: Extract Architecture
  run: riviere workflow run ./riviere-workflow.yaml

- name: Upload Graph
  uses: actions/upload-artifact@v4
  with:
    name: architecture
    path: ./architecture.json
```

---

## 4. What We're NOT Building

TBD — To be defined during discovery.

---

## 5. Success Criteria

TBD — To be defined during discovery.

---

## 6. Open Questions

1. **Workflow engine** — Build our own? Use existing (Windmill, Kestra, Dagster)? Script-based?

2. **State management** — How do workflows remember previous runs? Cache? Database?

3. **Error handling** — What happens when one step fails? Retry? Skip? Abort?

4. **Incremental extraction** — Can workflows extract only changed files?

5. **User input** — Some workflows need human decisions. How to handle in CI?

6. **Plugin architecture** — How do users add custom integrations?

7. **EventCatalog SDK** — Is it sufficient for our needs? Licensing? Maintenance?

---

## 7. Research Needed

### Workflow Orchestration Tools

| Tool | Type | Notes |
|------|------|-------|
| [Windmill](https://www.windmill.dev/) | Open source orchestration | TypeScript/Bash/Python, YAML workflows |
| [Kestra](https://kestra.io/) | Declarative orchestration | YAML-based, plugin system |
| [Dagster](https://dagster.io/) | Data orchestration | Python-native, asset-focused |
| [Apache Airflow](https://airflow.apache.org/) | DAG orchestration | Python, mature but complex |
| Custom scripts | Bash/Node | Simple but limited |

**Research questions:**
- Which tools support TypeScript natively?
- Which have good CI/CD integration?
- What's the learning curve for users?
- Can we embed workflows without requiring tool installation?

### Built-in Integration SDKs

| Tool | SDK/Package | License | Data Available |
|------|-------------|---------|----------------|
| [EventCatalog](https://github.com/event-catalog/sdk) | @eventcatalog/sdk | MIT | Events, services, producers/consumers, domains |
| [AsyncAPI](https://www.asyncapi.com/) | @asyncapi/parser | Apache 2.0 | Channels, messages, operations, schemas |
| [OpenAPI](https://www.openapis.org/) | @readme/openapi-parser | MIT | Endpoints, methods, schemas |
| [GraphQL](https://graphql.org/) | graphql (introspection) | MIT | Types, queries, mutations |
| [Protobuf](https://protobuf.dev/) | protobufjs | BSD-3 | Services, methods, messages |
| [Backstage](https://backstage.io/) | @backstage/catalog-model | Apache 2.0 | Services, ownership, metadata |

**Research questions:**
- What's the overlap between EventCatalog and our extraction?
- Can we contribute to EventCatalog rather than compete?
- Which integrations provide the highest value for MVP?
- What's the adoption rate of each spec in our target users?

### AI Integration Patterns

- How do other tools integrate LLMs into workflows?
- Batch vs streaming for large codebases?
- Cost management for AI calls?
- Local LLM options (Ollama, llama.cpp)?

---

## 8. Milestones

TBD — After research complete.

---

## 9. Dependencies

**Depends on:**
- Phase 12 (Connection Detection) — Core extraction capabilities

**Blocks:**
- Phase 14 (Cross-Repo Linking) — Workflows enable multi-repo extraction
