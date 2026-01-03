# Extraction Workflow

Extract architecture from your codebase into a Rivière graph.

This is a default workflow using AI to analyze code and the CLI to build the graph. You can customize it—replace steps, use different tools, or create your own extraction process. The CLI commands work independently of how you choose to run them.

## Workflow Principles

Where possible, use deterministic tools for faster, repeatable, and more reliable results. Leverage AI where code analysis alone doesn't work. As a starting point, using AI is helpful until you build your own tools.

Standardizing how architecture components are implemented in a codebase and enforcing those conventions is also highly recommended—this simplifies extraction and improves reliability.

## The 6 Steps Overview

| Step | Purpose |
|------|---------|
| **1. Understand** | Identify the domains, systems, and architectural conventions in your codebase—the foundations before extraction |
| **2. Define** | Every codebase is unique. Define the specific rules for identifying architectural components in your codebase |
| **3. Extract** | Scan the code to find components matching the rules and add them to the graph |
| **4. Link** | Scan the code to find the links between your components |
| **5. Enrich** | Add information not achieved during original extraction. Useful when deterministic tools handle earlier steps but AI is needed for semantic meaning |
| **6. Validate** | Validate the graph—does it satisfy the schema? Are there orphan components? This is also a refinement loop to improve extraction efficiency |

## Prerequisites

Open a terminal in your project directory and install the CLI:

**JavaScript/TypeScript projects:**
```bash
npm install -D @living-architecture/riviere-cli
```
Then use `npx riviere ...`

**Other languages (Java, Python, Go, etc.):**
```bash
npm install -g @living-architecture/riviere-cli
```
Then use `riviere ...`

## The 6 Steps

Each step runs in a separate Claude Code (or other) session. This keeps context fresh and lets you review between steps.

### Step 1: Understand

1. Open Claude Code (or other) in your project directory
2. Type:
   ```text
   Fetch https://raw.githubusercontent.com/NTCoding/living-architecture/main/packages/riviere-cli/docs/workflow/step-1-understand.md and follow the instructions
   ```
3. Claude analyzes your codebase and creates `.riviere/config/metadata.md`
4. Review the domains Claude identified. Give corrections if needed.
5. Close this Claude session

### Step 2: Define

1. Open a new Claude Code (or other) session in your project directory
2. Type:
   ```text
   Fetch https://raw.githubusercontent.com/NTCoding/living-architecture/main/packages/riviere-cli/docs/workflow/step-2-define-components.md and follow the instructions
   ```
3. Claude creates extraction rules in `.riviere/config/component-definitions.md`
4. Review the rules. Give corrections if needed.
5. Close this Claude session

### Step 3: Extract

1. Open a new Claude Code (or other) session in your project directory
2. Type:
   ```text
   Fetch https://raw.githubusercontent.com/NTCoding/living-architecture/main/packages/riviere-cli/docs/workflow/step-3-extract.md and follow the instructions
   ```
3. Claude finds components and adds them to the graph using the CLI
4. Review the component summary
5. Close this Claude session

### Step 4: Link

1. Open a new Claude Code (or other) session in your project directory
2. Type:
   ```text
   Fetch https://raw.githubusercontent.com/NTCoding/living-architecture/main/packages/riviere-cli/docs/workflow/step-4-link.md and follow the instructions
   ```
3. Claude traces flows between components and creates links
4. Review the links
5. Close this Claude session

### Step 5: Enrich

1. Open a new Claude Code (or other) session in your project directory
2. Type:
   ```text
   Fetch https://raw.githubusercontent.com/NTCoding/living-architecture/main/packages/riviere-cli/docs/workflow/step-5-enrich.md and follow the instructions
   ```
3. Claude adds state changes and business rules to DomainOp components
4. Review the enrichments
5. Close this Claude session

### Step 6: Validate

1. Open a new Claude Code (or other) session in your project directory
2. Type:
   ```text
   Fetch https://raw.githubusercontent.com/NTCoding/living-architecture/main/packages/riviere-cli/docs/workflow/step-6-validate.md and follow the instructions
   ```
3. Claude checks for orphans and validates the graph
4. Fix any issues
5. Your graph is complete at `.riviere/graph.json`

## Output

After completing all steps, your project will have:

```text
.riviere/
├── config/
│   ├── metadata.md              # Domains and conventions
│   ├── component-definitions.md # Extraction rules
│   └── linking-rules.md         # Cross-domain patterns
└── graph.json                   # The Rivière graph
```

## Catching errors and improving the workflow

If Claude misses components or makes mistakes:

1. Give feedback in the current session
2. Or re-run that step with corrections:
   ```text
   Fetch https://raw.githubusercontent.com/NTCoding/living-architecture/main/packages/riviere-cli/docs/workflow/step-3-extract.md and follow the instructions.
   You missed the API controllers in src/api/. Include those.
   ```

**To improve future extractions:**

- **Update configuration and rules** — Fix `.riviere/config/` files so the same problem doesn't happen next time
- **Enforce codebase standards** — Add conventions for how components are implemented, reducing the need for complex extraction rules
- **Build deterministic tools** — Create scripts that extract components reliably, then integrate them into the workflow
