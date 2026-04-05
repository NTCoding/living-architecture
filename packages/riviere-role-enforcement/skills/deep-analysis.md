# Deep Analysis Skill

When code has role enforcement violations, work through these steps in order.

## Before You Start

1. Read the role enforcement config file to understand valid locations, allowed roles, forbidden imports, and the path to the canonical role configurations file.
2. Read the canonical role configurations file referenced in the config. Your solution MUST match one of these configurations.

## Step 1: Is the code used in a single location?

If yes → would inlining the code into the caller be valid (passes all role enforcement AND dependency rules)?

- If yes → inline it.
- If no → which part of the inlined code causes the validation error?

Before considering moving code, check whether the violation is caused only by importing a foreign-owned data type or options type.

- If yes → can the caller map its owned type into a callee-owned local type and pass plain data instead?
- If yes → prefer that mapping-layer solution first.
- The callee replaces the forbidden import with a local type definition for the shape it consumes.
- The caller keeps ownership of its original type and maps onto the callee-owned type.

## Step 2: Where does the invalid code belong?

Identify where the invalid code is supposed to live. The proposed location MUST be a valid location defined in the role enforcement config.

## Step 3: Move the invalid code to where it belongs

## Step 4: Propose 3 possible solutions for making the code compile/work now

Rank them by simplicity and correctness.

## Step 5: Validate every proposed solution

For EACH solution, trace every import in the proposed code. Verify that NONE of them violate forbidden import rules. If a solution has even one forbidden import, it is INVALID — discard it and try again.

## Step 6: Recommend the top-ranked valid solution

## Rules

- Every proposed solution MUST result in code that passes all role enforcement rules AND all dependency rules.
- If a solution would leave code in a location not defined in the config, it is INVALID.
- Do NOT recommend changes to the role enforcement config unless it is IMPOSSIBLE to solve the problem without config changes. If you believe config changes are needed, you MUST first show your closest attempt at solving it without config changes and explain exactly why it fails. Receipts required.
- If the only forbidden dependency is a data structure or options type, prefer a simple caller-side mapping layer over cross-layer type reuse.
- The callee MUST define and own the input shape it consumes.
- Never import a type from another layer just because the fields happen to match.
