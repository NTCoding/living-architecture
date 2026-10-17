# Slice 0 spike

Throwaway code, used to answer the four Mastra questions in `plan.md` before
slices 1 to 3 depend on the answers. `FINDINGS.md` has the results.

Run any check with `npx tsx spike/<file>.ts`. No API key is needed, because
checks 2 and 4 drive a mock model.

```text
check-1-nested-workflow.ts   a step starts another workflow, and .dountil loops over it
check-1b-loop-shapes.ts      what happens when a looped step's input and output differ
check-1c-loop-wider-output.ts  a looped step that returns more than it takes
check-1d-loop-carried-state.ts a loop that carries the cycle state forward
check-2-auto-resume.ts       a suspended tool resumes from the next chat message
check-3-file-agent.ts        a file based agent at src/mastra/agents/{agent}/
check-4-workspace-hook.ts    a beforeToolCall hook refuses an execute_command call
mock-model.ts                the stand-in model used by checks 2 and 4
app/                         a tiny project for `mastra build`, used by check 3
```

For check 3's build half:

```bash
cd spike/app && cp package.json.spike package.json && npx mastra build
rm -rf .mastra package.json
```

The `package.json` is kept aside because nx treats any folder with one as a
project, and then runs lint on throwaway code.

The packages were added to the root `package.json` for the spike only.
