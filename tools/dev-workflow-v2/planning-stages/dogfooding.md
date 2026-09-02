# dogfooding

Create and approve:

```text
docs/project/PRD/<planning-id>/dogfooding.md
```

This stage happens after architecture approval and before delivery planning.

## Purpose

We need a high level of confidence that our product functionality meets the needs of our users, and we want to understand what is like from their perspective to use the tool. Therefore, we leverage dogfooding. We have example projects that try to simulate the real experience of consumers.

In this step of the planning process, your objective is to look at the new PRD.md and ARCH.md and identify what new functionality is being added and how can we dogfood it to verify it works as expected and to ensure it provides the optimal experience for our users. It's a crucial step that must be done with care and high levels of rigour to leave no stone unturned.

`ecommerce-demo-app` is a user and customer demo, not merely a fixture repository. Its purpose is to demonstrate supported Living Architecture capabilities through a realistic, runnable customer journey. A dogfooding deliverable must exercise the capability it names through the product. Source files, mappings, generated fixtures, and tooling are evidence for that journey; they are not the customer outcome on their own.

If a capability is not supported yet, source preparation may be planned separately, but it must be described as preparation and must not claim to demonstrate that capability. The executable demo and customer validation must wait until the product can run the relevant journey.

You will produce the document `docs/project/PRD/<planning-id>/dogfooding.md` with this exact top level structure:

1. New functionality added in this PRD to verify
2. What dogfooding exists today
3. What new dogfooding to add
4. Blockers

## Required inputs

Use the approved planning artefacts passed in the runtime context:

- `problemDefinitionPath`
- `prdPath`
- `architecturePath`
- `dogfoodingPath`

The known dogfooding source for this repository is:

| Field | Value |
|---|---|
| Dogfooding source | `ecommerce-demo-app` |
| Location | `../ecommerce-demo-app` |
| README | `../ecommerce-demo-app/README.md` |

## Step 1: Extract dogfooding requirements from PRD.md and ARCH.md

Read `problem-statement.md`, `PRD.md`, `solution-exploration.md` and `ARCH.md`. Extract a list of new and modified functionality that needs to be verified via dogfooding.

Examples to look for (non-exhaustive):

1. New /enhanced CLI commands
2. New use cases and user journeys
3. New / improved UI pages
4. Observability enhancements
5. Advanced options adding to existing capabilities

Output them into the first section of the document `New functionality added in this PRD to verify`.

The output should be a simple a summary of the changes with a list of specific changes with references to the source of truth, for example:

```text
1. New CLI command "riviere parallel", this runs multiple steps in parallel. Reference: PRD.md line 5
```

In this section it is crucial to capture all new functionality

## Step 2: Review existing dogfooding

The current dogfooding project is ../ecommerce-demo-app / github.com/ntcoding/ecommerce-demo-app. The `README.md` of the repository provides a detailed guide explaining how it validates existing functionalty. After reading the README, scan the interesting parts of the repository referenced in the README so that you understand how it works.

In the output document, write section 2 `What dogfooding exists today`. This should contain a textual summary along with key bullet points that seem relevant to the changes introduced by this PRD.

## Step 3: Designing new dogfooding solutions

This step is crucial. It is important to design a detailed solution that fully exercises the capability. Mistakes here will result in customers having a bad or broken product and we don't realise because it falls through our net.

For every proposed dogfooding deliverable, first state:

1. the high-level purpose of the demo update;
2. the supported capability and customer journey it exercises; and
3. why that journey matters to a user or customer.

High-level purpose does not mean abstract wording. Name the product capability, the action the user takes, and the result the user sees. Never use an undefined reference such as “the Workflow”, “the demo”, “the customer journey”, “the result”, “all capabilities”, or “everything”. At the point of reference, name the file, stages, sources, commands, outputs, or decision involved, or link to the exact source that defines it. For a Workflow deliverable, an agent must write `riviere-workflow.yaml` with its named stages, not “the Workflow”.

Only then specify the files, configurations, fixtures, scripts, and README changes that make the journey executable and repeatable. Do not present an artefact list as the dogfooding solution or as user value.

Another crucial objective for this step is to ensure the requirements for engineers are sufficiently detailed so there are no mistakes or misassumptions when planning or implementing the dogfooding solution. So detail is crucial, it's better to over-specify the solution than unders-specify. Lots of code / configuration samples are encouraged showing exactly how this solution will look in the target repository and it must be implementable.

If your dogfooding solution is to create a new configuration file: the full file should be specified here along with it's location in the dogfooding repo. If your solution is a new CI step the github workflow YAML should be fully defined here. If your solution is to create a new lint it should be fully defined and here. You get the picture - this is not a whishlist, this a detailed, implementable specification that is compatible with the existing dogfooding application. You must explain how the solution will fit into the dogfooding repo and how it will fit alongside what is already there.

There is not specific solution for implementing dogfooding but ideas include:

1. CI jobs that automatically run riviere and fail the build if riviere doesn't function correctly
2. Pre-commit hooks that prevent the code being commited if riviere doesn't produce the correct result
3. Unit tests
4. Lint rules
5. Custom scripts
6. Custom tools for exploring the outputs

Do not be constrained by this list. Think hard about the best but also new and novel ways to dogofod the product. If the existing ecommerce-demo-app is not ideal, then propose something else. Full freedom to innovate and allow us to better serve the needs of users.

When working in the dogfooding repo, you MUST always update the README. README changes should be listed here as deliverables.

## Step 4: Blockers

If anything is unclear, under-specified or otherwise blocking the production of dogfooding requirements then list them here and it will block the planning process. Do not workaround problems, it will only result in worse solutions and recurring problems. Stop. seek clarification, discuss with the user and do things properly. It's what our users need and deserve. Quality over speed every time.
