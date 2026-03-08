# cli-shell

## Purpose

`cli-shell` owns process startup wiring for a CLI surface.

## Placement

- Put the symbol under `shell/`.
- Keep it in a file matched by the role config's allowed locations.

## Naming

- Use `createProgram` or `main`.

## Allowed Public Methods

- This role is for standalone functions.
- Do not introduce class APIs for this role.

## What To Keep Out

- Do not parse external input here.
- Do not format user-facing output here.
- Do not put query or infra behavior here.
