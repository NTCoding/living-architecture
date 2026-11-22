# entrypoint-cli-input-parser-input

## Purpose

A data-structure interface that holds raw external input passed to an entrypoint CLI input parser.

## Behavioural Contract

1. A plain data structure with no methods or callable properties.
2. Contains primitive values, arrays, and nested data structures only.
3. Represents CLI options or other raw external input.

## Anti-Patterns

- Callable members belong in a dependencies interface, not input data.
- Domain rules belong in the domain that owns them.
