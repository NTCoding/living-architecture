# Problem Definition: Pull Request Diffs

**Status:** Approved

---

## Approved inputs

**Section approval:** Approved

- Who: Developers and maintainers reviewing changes made by AI agents, plus principal engineers and architects who need to track architecture outside the immediate team.
- What: Key architecture and domain model changes do not “jump out”. They are easily missed among hundreds of lines of code and require manual extraction. The working proof of concept is an isolated script which nobody else can use.
- Where: Primarily during pull request review, but also when comparing any two Rivière graph states to understand architectural evolution.
- When: Before a pull request is merged, as the last chance to prevent unnoticed architecture mistakes; secondarily, when someone returns after time away and needs to understand how the architecture evolved.
- Why: Users need to be fully aware of every key architecture and domain model change. Architecture mistakes which pass unnoticed are hard to correct later.

## Problem statement

**Section approval:** Approved

AI agents are doing much of the implementation work, while key architecture and domain model changes can remain hidden among hundreds of lines of code. Developers and maintainers reviewing pull requests may therefore miss important decisions before merge, allowing architecture mistakes to pass unnoticed and become difficult to correct later.

The same visibility problem affects principal engineers and architects who need to understand how architecture evolved across a longer period. A working architecture diff proof of concept exists, but it is an isolated script which nobody except its creator can use.
