# cli-entrypoint

## Purpose

`cli-entrypoint` builds a concrete CLI command surface for one feature interaction.

## Placement

- Put the symbol under a feature `entrypoint/` location.
- Keep it in a file matched by the role config's allowed locations.

## Naming

- Name the function `create...Command` for the concrete command it builds.

## Allowed Public Methods

- This role is for standalone functions.
- Do not introduce class APIs for this role.

## What To Keep Out

- Do not own shell startup wiring here.
- Do not move graph/query persistence helpers into this role.
- Do not hide domain or infra behavior behind generic utility names.
