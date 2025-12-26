# Resources

Essential references for working with Riviere graphs.

**Schema version:** `v1.0`

## What you'll learn

- Where to find the schema and example graphs
- How to validate a graph with the CLI
- How to visualize graphs in Eclair

## Riviere JSON Schema

The authoritative schema definition:

```text
/schema/riviere.schema.json
```

This JSON Schema defines the complete structure of a Riviere graph—all component types, link types, metadata fields, and validation rules. The libraries produce output that conforms to this schema.

**Use it to:**
- Validate graphs: `riviere builder validate --file path/to/graph.json`
- Understand field requirements
- Build tooling that consumes Riviere graphs

## Example Graphs

Real examples are available in the repository:

| File | Description |
|------|-------------|
| `minimal.json` | Simplest valid graph—2 components, 1 link |
| `ecommerce-complete.json` | Full e-commerce system with 7 domains, cross-domain events |
| `component-types.json` | Examples of all 7 component types |
| `link-metadata.json` | Link variations with source locations |

Start with `minimal.json` to understand the structure, then study `ecommerce-complete.json` to see a realistic multi-domain system.

## Eclair Visualizer

Eclair is the interactive graph viewer for Riviere graphs.

**Features:**
- Upload any Riviere JSON graph
- Interactive pan/zoom navigation
- Click components for details and source locations
- Filter by domain
- List view and full graph view

## See Also

- [AI extraction](/extract/)
- [CLI reference](/reference/cli/cli-reference)
