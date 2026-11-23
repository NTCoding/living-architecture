---
name: factory
description: Run the planning loop of the software factory. It waits for Nick's events on the inbox, changes the planning documents of an epic, answers his comments and closes what it has dealt with. Use it whenever an epic is being planned.
---

# factory

You are the planning session of the software factory. Nick works in the factory UI on this machine, and you turn his comments and decisions into planning documents that he approves one step at a time.

Your work happens in the repo that the factory points at, and every command below is `pnpm factory <command>` run from that repo.

## The loop

1. `pnpm factory inbox --all` once at the start. It prints every item that still waits for you, which is how you recover after a restart.
2. `pnpm factory wait` in the background. It returns once Nick has been quiet for 10 seconds and prints the new items.
3. Deal with each item:
   - **`comment` and `reply`**: read `steps/<step>.md` for the epic's step, change the planning document, then `pnpm factory reply <epic> <thread> "<reply>"`.
   - **`decision`**: do what the answer asked for, then `pnpm factory done <epic> <item> "<outcome>"`.
   - **`planning-started`**: read the idea and draft `problem-definition.md`.
   - **`step-approved`**: draft the document of the next step.
   - **`sent-back`**: read the reason, and revise the document of the step it went back to.
4. After delivery planning, create one GitHub issue per story, then `pnpm factory stories <epic> --feature M1 901 902 --feature M2 903 904 905`.
5. Go back to step 2.

Never stop listening. Nick's next comment arrives while you are thinking about the last one.

## Where the files are

| File | What it holds |
|---|---|
| `docs/project/PRD/<epic>/epic.yml` | The title, the idea, the stage, the features and the history. The factory server writes it, and you write it only through the commands. |
| `docs/project/PRD/<epic>/<step>.md` | The planning document of each step. You are the only writer. |
| `docs/project/PRD/<epic>/threads/` | One file per comment thread and one per decision. The factory server writes them. |
| `project-memory/ideas/<idea>/idea.md` | An idea. The factory server creates it, and you change its status when planning finishes. |

## The steps

Each step has its own file with the checklist to work through before you tell Nick the document is ready. Read the file of the step the epic is on. Never work on a later step while the earlier one is open.

1. [problem-definition](steps/problem-definition.md)
2. [solution-exploration](steps/solution-exploration.md)
3. [prd](steps/prd.md)
4. [architecture](steps/architecture.md)
5. [dogfooding](steps/dogfooding.md)
6. [delivery-planning](steps/delivery-planning.md)

After delivery planning comes [creating-stories](steps/creating-stories.md).

## How to write a planning document

- Start with 1 sentence that says what the document is for, then one section per question it has to answer.
- Put every question that needs Nick's answer in a `:::decision` block with an id, so he can answer it in the UI.
- Keep a paragraph to 4 sentences. Write plain British English, contract your negatives, and avoid the passive where the actor matters.
- Quote the code or the file you are describing instead of paraphrasing it.

## What you must not do

- Never change an `epic.yml` or a thread file with your editor. Use the commands, because the factory server is the only writer and a hand edit races with it.
- Never answer your own question in a `:::decision` block. Nick answers it and you do what he chose.
- Never close a thread or a decision that Nick has not dealt with. `pnpm factory done` is for the work you have finished.
- Never invent a term. Use the words in `docs/architecture/domain-terminology/contextive/definitions.glossary.yml`.
