# Step 1: Understand the Codebase

## Objective

Analyze this codebase to understand its structure, conventions, and domain boundaries. Produce a reference document for subsequent steps.

## Principles

- **Accuracy over speed** — Take time to find evidence, don't guess
- **Ask when uncertain** — If domain boundaries are unclear, ask the user

## Where to Look

Check these locations in order:

1. **AI instruction files** (highest signal)
   - `CLAUDE.md`, `claude.md` in root and subdirectories
   - `AGENTS.md`, `agents.md`

2. **Documentation**
   - `/docs` folder
   - `README.md` files
   - Architecture decision records (ADRs)

3. **API specifications**
   - OpenAPI/Swagger specs
   - AsyncAPI specs
   - GraphQL schemas

4. **Configuration files**
   - `package.json`, `tsconfig.json` (Node.js/TypeScript)
   - `pom.xml`, `build.gradle` (Java)
   - `requirements.txt`, `pyproject.toml` (Python)

5. **Code structure**
   - Folder organization
   - Naming patterns
   - Module boundaries

## Output

Create `.riviere/config/` directory. Save analysis as `.riviere/config/metadata.md`:

```markdown
# Codebase Analysis

## Structure
- Root: [absolute path]
- Source code: [e.g., src/, lib/, app/]
- Tests: [e.g., tests/, __tests__]

## Domains

List each domain with:
- **[domain-name]** ([type]: domain|bff|ui|other) — [description]

Domain types:
- `domain` — Core business domain (orders, inventory, shipping)
- `bff` — Backend-for-frontend, aggregates calls
- `ui` — User interface layer
- `other` — Infrastructure, shared libraries

## Module Inference

How to derive module from file path:
- Rule: [e.g., "second folder level under src/"]
- Example: `src/orders/checkout/PlaceOrder.ts` → domain: orders, module: checkout

## Frameworks
| Category | Name | Version |
|----------|------|---------|
| Web framework | | |
| Event/messaging | | |
| Database | | |

## Conventions
- File naming: [pattern]
- Class naming: [pattern]
- API pattern: [how to recognize]
- Use case pattern: [how to recognize]
- Entity pattern: [how to recognize]
- Event pattern: [how to recognize]

## Entry Points
| Type | Location | Pattern |
|------|----------|---------|
| API routes | | |
| Event handlers | | |
| UI pages | | |

## Notes
[Any other observations]
```

## Completion

Present your domain analysis to the user:

1. List each proposed domain with type and description
2. Ask: "Do these domain boundaries match your architecture? Any corrections?"

**Step 1 complete.** Wait for user feedback before proceeding.
