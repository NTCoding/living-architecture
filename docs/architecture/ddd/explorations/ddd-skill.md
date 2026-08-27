# DDD skill exploration

This document captures the ideas and examples that are shaping `/ddd`. It is a
living exploration, not the final skill specification.

## The problem

AI models tend to optimise for making something work quickly. In a DDD
discussion, that creates shallow models which are easy to implement but do not
represent the domain well.

The common failure pattern is:

1. Promote the feature name into a domain concept.
2. Turn the first plausible idea into a proposed design.
3. Present several renamed versions of the same design as alternatives.
4. Ask the user to approve one.
5. Treat implementation as the real work and modelling as a short preliminary
   step.

This makes the AI an approval conveyor belt. `/ddd` should make it a
collaborative modelling partner.

## Standards based packaging

Package the skill at `.agents/skills/ddd/SKILL.md` using the Agent Skills
standard. The skill is the canonical procedure. Do not add a Claude command,
provider specific wrapper, or plugin manifest.

`/ddd` is the intended explicit invocation. Keep the skill portable and do not
add provider specific invocation policy. Implicit selection is acceptable when
an agent identifies a matching domain modelling discussion.

The runtime skill should contain the distilled modelling behaviour. This
exploration document preserves the reasoning which shaped it, but the skill
should not load the whole exploration during normal use. It should refer only
to the generated domain guide, glossary, role definitions, and other repository
evidence needed for the current modelling question.

## Exploration before convergence

`/ddd` remains in exploration mode until the user explicitly asks it to
recommend, converge, or choose a model.

During exploration, a candidate model is a probe rather than a proposal. For
each candidate, the agent should explain:

- what evidence it fits;
- what it fails to explain;
- which assumptions it depends on;
- which responsibilities, lifecycles, invariants, and boundaries it implies;
- what evidence or domain knowledge would distinguish it from other candidates.

Different names do not make different options. Alternatives must explore
meaningfully different interpretations of the domain or ownership of behaviour.

The agent must not quietly promote a candidate into the selected design. It
must not begin implementation planning while the model is still being explored.

## Converge gradually

When the user explicitly asks to converge, `/ddd` should begin a gradual
convergence discussion. It should identify the model which currently appears
most suitable and explain why it leads, based on domain expertise, repository
evidence, credible future changes, and role constraints.

The leading model remains open to challenge. The agent should state the
important weaknesses, assumptions, and unresolved questions which could still
change the recommendation. It should compare the leading model with the
strongest remaining alternative when that distinction helps the discussion.

Convergence is not a request for implementation approval. The agent must not
turn the leading model into a finished solution, ask the user to confirm it so
coding can begin, or produce an implementation plan unless the user later asks
for one. New evidence can move the discussion back towards exploration or make
a different model the leader.

Only the user decides when convergence is complete. The agent must not infer
completion from its own confidence, a lack of objections, or the apparent ease
of implementation. Agreement confirms the domain model only; it does not
authorise planning or implementation.

### Produce an approved model summary

After the user declares convergence complete, `/ddd` should draft a concise
model summary for the user to approve. The summary should capture:

- the domain problem and story;
- the agreed concepts and their responsibilities;
- identity, ownership, lifecycle, and invariants where relevant;
- boundaries and collaborations between concepts or subdomains;
- the supported operations involved in the model;
- the credible future changes used to test the model;
- role enforcement implications;
- remaining risks and unresolved questions.

The summary is not an implementation plan and must not contain speculative
code tasks. Store the approved summary at
`docs/architecture/ddd/explorations/<exploration>/model-summary.md`.
Use a stable descriptive slug for `<exploration>`, using lowercase words joined
by hyphens and no date prefix. Approved revisions of the same model update the
same summary rather than creating dated copies.

## Conversation rhythm

The default is one important modelling question per turn. This prevents the
agent from racing several decisions ahead of the user.

A useful turn should:

1. Restate the current shared understanding.
2. Surface one important tension, ambiguity, or assumption.
3. Bring relevant evidence from the domain, code, or project rules.
4. Introduce a challenge or a genuinely different angle.
5. Ask one focused question.
6. Update the shared understanding from the answer.

This is a default rhythm, not a mechanical restriction. A short clarification
may be needed to resolve the same question. The agent should contribute insight
rather than only interview the user, but it should not front load a large
questionnaire or a finished design.

## Immerse in the relevant subdomains

Before presenting its first problem interpretation, `/ddd` should immerse
itself in the relevant subdomains. The generated domain guide provides the
starting map, but the agent must inspect the code and behaviour behind the
relevant entries.

When an existing operation is affected, give particular attention to its use
case, the aggregate or domain service operations it invokes, and the tests which
show its current behaviour. Follow repositories, ports, or neighbouring domain
concepts when they are needed to understand ownership, lifecycle, rules, or a
boundary with another subdomain.

Passing tests are proof that the covered behaviour works under the tested
conditions. They establish concrete facts about the current system. They do not
by themselves prove that the behaviour or model agrees with domain expertise.

When the work introduces a new use case, inspect the existing use cases which
are most closely related in domain purpose. Similar names or technical shapes
are not enough. Prefer use cases which affect the same lifecycle, decision,
aggregate, domain service, or business outcome.

The agent should also consult
`docs/architecture/domain-terminology/contextive/definitions.glossary.yml` for
the domain language it encounters. It may look up an exact glossary `name`, but
it should not split identifiers, change case, infer synonyms, or use semantic
similarity to claim a match. When there is no exact entry, record
`<no glossary match>`. Do not invent a definition or modify the glossary during
exploration.

The relevant scope may include more than one subdomain. The agent should follow
the behaviour across those boundaries rather than force the problem into the
first package it finds.

Immersion is sufficient when the agent can explain the current behaviour,
ownership, state changes, important rules, and unresolved questions in domain
language. The purpose is to build an evidence base for exploration, not to
accept the current implementation as the correct model.

## Begin with a challengeable problem interpretation

`/ddd` should not make the user explain the whole domain before it contributes
anything. It should inspect the available request, code, domain language,
documentation, and current behaviour, then explain what it thinks the domain
problem is.

This first explanation is a draft to test with the user, not a statement of
fact. It should:

- describe the problem in domain language rather than propose a solution;
- show which observations support that interpretation;
- distinguish observations from the agent's inferences;
- expose important assumptions and missing knowledge;
- invite the user to correct what is wrong, incomplete, or framed at the wrong
  level.

The user should be able to react to a concrete interpretation rather than
answer a blank opening question. The agent then revises its understanding and
continues the exploration from that shared problem framing.

## Start with the domain story

Every candidate model must first be explained in plain domain language. Types,
classes, repositories, Rivière roles, and code sketches come later.

The plain language explanation should describe:

- what happens in the domain;
- who or what makes decisions;
- what state changes;
- which rules must remain true;
- which lifecycle is being protected;
- why each proposed concept exists.

If the model cannot be explained without implementation vocabulary, it is not
ready to be represented in code.

## The domain expert test

Every candidate should be tested against domain expertise:

- Would a domain expert recognise these concepts and this language?
- Would they describe the process and decisions this way?
- Does the model keep separate things that the expert considers different?
- Does it group things because they belong together in the domain, or because
  one class would be easier to implement?
- Do its boundaries reflect business responsibility, lifecycle, and rules?
- Can the reason for each concept be explained without mentioning a technical
  pattern?
- Has the model invented technical nouns that have no domain meaning?

When no domain expert is present, the agent must identify its assumptions and
formulate questions for the expert. It must not treat plausible code vocabulary
as confirmed domain language.

## Test the model against future evolution

A model must explain the current behaviour, but current fit is not enough.
`/ddd` should use credible future changes to expose the strengths and weaknesses
of each candidate.

Example questions include:

- What if the business sells a different product?
- What if it serves a different market?
- What if the same capability must be exposed through a web interface rather
  than only through the CLI?
- What if a rule, workflow, integration, or source of data changes?

For each credible scenario, ask:

- What stays stable?
- What must change?
- Where does that change land?
- Does the domain language remain honest?
- Are the same invariants still protected by the right owner?
- Does the change spread through unrelated components?
- Does the model need exceptions or awkward translation to survive?

A candidate becomes more appealing when likely changes remain local and its
concepts continue to mean the same thing. It becomes less appealing when change
requires renamed concepts, weakened invariants, stretched aggregates, special
cases, or role enforcement exceptions.

Future scenarios are stress tests, not permission to build speculative
abstractions. The agent must distinguish credible evolution from an imagined
possibility that has no reason to influence the current model.

## Use code as modelling evidence

The agent should inspect the real code and follow the end to end behaviour
before proposing a technical representation. Existing code provides evidence,
but existing classes and names are not automatically the correct model.

The exploration should distinguish:

- repository facts;
- interpretations of those facts;
- unanswered domain questions;
- candidate models;
- decisions the user has confirmed.

A feature name is a clue, not an aggregate. An existing abstraction may be
misnamed, too narrow, too broad, or no longer right. A new concept must earn its
name by clarifying a lifecycle, invariant, responsibility, or boundary.

## Who owns the current domain model?

Before `/ddd` can interpret a domain problem, it needs to know what the team
currently believes the domain model is. That understanding should be owned by
the team and available to people and agents. It should not have to be inferred
afresh by every agent from whichever files it happens to inspect.

The repository currently contains several parts of that understanding:

- package paths identify the implemented subdomains and their domain model
  packages;
- `@riviere-role` annotations classify exported declarations as aggregates,
  value objects, domain services, domain events, domain ports, and other roles;
- `.riviere/roles.ts` records the explicitly approved aggregate names and the
  constraints attached to every role;
- role definitions describe the intended responsibility of each tactical role;
- the domain glossary defines shared terms;
- implementation code contains the current behaviour, state, and invariants;
- architecture memories and decisions preserve selected reasoning and rejected
  designs.

There is no single committed artefact which joins these parts into an explicit
statement of the current domain model.

### What role annotations can contribute

Role annotations are useful because they are local to the code and enforced.
They can provide a reliable inventory of declarations which the team has
classified as part of the tactical domain model. The aggregate approval list is
an even stronger signal because each aggregate classification requires an
explicit user decision.

PR 476 also introduces a required `@riviere-role-justification` for domain
services. That creates a possible source of local reasoning about why behaviour
does not belong to an aggregate or value object.

The role enforcer already resolves declaration names, file locations, imports,
type roles, and some calls in order to enforce dependency rules. Those facts may
help reveal the implemented relationships between tactical roles.

### What role annotations do not say

A role is an architectural classification, not a complete domain description.
The annotation alone does not explain:

- what a concept means to a domain expert;
- why it exists;
- which business lifecycle it represents;
- which invariants it protects;
- how concepts relate in domain language;
- which future changes the boundary is intended to absorb;
- whether the current code still represents the model the team believes is
  right.

Annotations can also preserve a mistaken classification. Enforcement can prove
that the code follows the contract for its declared role, but it cannot by
itself prove that the team chose the right domain concept or role.

### Resolve authority without duplicating it

A model derived from annotations can remain close to the code, but it risks
making the implementation describe itself and calling that the domain model. A
separate human owned model can express domain expertise and intent, but it can
drift from the code.

Authority remains with the package descriptions, role annotations, code,
glossary, and approved architecture decisions. The generated guide assembles
those sources without becoming another hand maintained model. `/ddd` treats a
disagreement between those sources and domain expertise as something to
explore, not something the generator can resolve.

## Generate a domain guide

The chosen direction is a repository script at `/build-domain-guide.sh`. An
agent or person can run it to build an up to date Markdown view of the current
domain model from sources owned by the team.

The generated file would be a view, not another source of truth to maintain by
hand. Missing or ambiguous source information should fail generation or remain
visible. The generator must not invent domain explanations from class names.

The contents and subdomain overview form the navigation layer for `/ddd`. The
agent should use them to select relevant subdomains, then read only those
detailed sections before moving into code and tests. It should expand into
another subdomain when evidence reveals a collaboration or ownership question,
not load every detailed section in advance. This keeps discovery useful as the
repository gains more subdomains.

### Domain guide source information

The repository could provide the guide with:

- workspace package manifests to discover domain model and published language
  packages;
- a required domain description owned by each domain package;
- `@riviere-role` annotations to classify tactical model declarations;
- the approved aggregate list;
- public aggregate operations extracted from code.

The guide does not need source file links. Exact use case, aggregate, domain
service, and operation names are enough for an agent to locate the relevant
implementation with `rg` when it begins deeper investigation.

For a domain service invoked by a use case, the guide should show only the
invoked operation. It should not copy the service's
`@riviere-role-justification` into the generated document.

The generator should not parse or copy the glossary. The generated guide should
refer readers and agents to the glossary as the owned source for shared domain
language. Exact term lookup happens during `/ddd` investigation, not during
guide generation.

The initial guide deliberately stops at this evidence. Domain meaning,
lifecycle, invariants, and future change reasoning remain part of `/ddd`
exploration rather than generated claims.

### Subdomain descriptions

The guide should be organised by subdomain and every subdomain should have a
description. A subdomain is discoverable when its package group contains a
domain model or published language package.

The `description` field in each domain model package's `package.json` is the
authoritative source for that subdomain description. The generator should copy
it into the guide without inventing or expanding the prose. When a subdomain
has no domain model package, the published language package description becomes
the authoritative source instead.

Role enforcement requires a non-empty description for both package kinds. This
prevents published language only subdomains from disappearing merely because
they have no aggregate model.

Making a description mandatory through role enforcement would therefore need a
new package level rule rather than another declaration role. Any corresponding
change inside `.riviere` requires explicit user approval.

README presence and content are outside the scope of role enforcement. The
enforcer should require the package description, but it should not validate
whether a package README exists or what it links to.

### Package READMEs point to owned domain information

Each domain model and published language package should have a README which directs readers to the
package description and the generated domain guide for current domain
information. The README should not maintain another copy of the subdomain
description or concept inventory.

The authority chain is:

- the package description owns the subdomain summary;
- role annotations and code own the extracted concepts and operations;
- the generated domain guide is the canonical browsable assembly of those
  sources;
- package READMEs direct readers to the owned sources.

Existing package documentation can still explain installation, public APIs,
and development workflows. It should refer to the owned sources rather than
maintain a second domain summary which can drift.

### Published language only subdomains

A published language package can represent a subdomain even when it has no
domain model package, aggregates, or use cases. The guide should list its
purpose and package name so an agent can begin at its public contract.

The guide must not reclassify schemas, annotations, parsers, data structures,
or value objects as aggregates merely to fill an aggregate section. It should
state that the subdomain currently exposes published language only. Detailed
published language concept extraction can be considered separately if the
package entry point is not a sufficient discovery anchor.

### Aggregates as discovery anchors

The domain guide should stay with aggregates rather than list every annotated
domain service. The current domain model packages contain only three approved
aggregates but roughly 150 declarations classified as domain services. Listing
every service would obscure the model rather than explain it.

Each subdomain section should show its approved aggregates. An agent should use
those aggregates as the starting points for discovery, then inspect their
behaviour and collaborators. It must not assume that the aggregate list is a
complete or unquestionably correct model.

Each aggregate should list all its public methods, including methods which no
current use case invokes. These operations provide initial clues about the
aggregate's behaviour, implementation, and lifecycle. The separate use case
view shows which operations the application currently exposes. List method
names only; signatures remain in the implementation for targeted inspection.
Code alone cannot reliably explain the lifecycle, invariants, or domain
meaning, so those details still require deeper investigation rather than
generated prose.

### Supported operations and app usage

Command use cases and query use cases reveal the operations that a subdomain
currently supports. They are a different view from aggregate methods:

- aggregate methods show behaviour owned by an aggregate;
- command use cases show state changing application operations;
- query use cases show the questions the application can ask;
- app entrypoints show which operations are exposed through a particular app.

Where a use case invokes an aggregate or domain service, the guide should show
the invoked operation as well as the concept name and role. This connects the
application operation to the domain behaviour it invokes. For example:

- `ExtractDraftComponents -> aggregate RiviereProject.extractDraftComponents`
- `CreatePullRequest -> domain service Workflow.createPr`

Use case packages already belong to a named subdomain, so the generator can
group annotated `command-use-case` and `query-model-use-case` declarations with
that subdomain.

The initial detailed app view should focus on the CLI. Its entrypoints import
command and query use cases, which can reveal where each operation is used and
how the CLI exposes the subdomain. This relationship should be derived from
actual imports and role annotations, not from similar names.

The guide only needs a simple description of `apps/eclair` and `apps/docs` for
now. It should not attempt the same operation mapping for those apps or present
their shallower coverage as a problem which must be solved before the guide is
useful.

### Generator boundary

A shell command can provide a simple entrypoint. The first version should
prioritise fast generation over a complete relationship model. It should do the
minimum parsing needed to inspect each command or query use case and report any
aggregate or domain service directly present in that file.

The first version should not build a dependency graph, follow calls, traverse
arbitrary dependencies, or resolve transitive relationships. It may inspect a
repository used by the use case and use the repository operation's declared
return type to identify the aggregate. That is a bounded lookup from the use
case, not general dependency analysis.

After identifying an aggregate or domain service, the generator should record
direct calls to it inside the use case. A domain service may be invoked through
a class method or as an imported function. The generator should not follow the
invoked operation or analyse what it calls. This remains a local syntax and
type lookup rather than call graph construction.

Reliable extraction should not depend on broad text matching. A small parser or
the narrowest useful part of existing Rivière analysis may still be appropriate,
provided it does not turn guide generation into a full architecture analysis.
The generator does not inspect tests; `/ddd` reads relevant tests during its
deeper investigation of a particular modelling question.

The generator must inventory production source only. It should exclude spec
files, test files, fixture files, and source code embedded in fixture strings.
Tests remain evidence for `/ddd` investigation, but their declarations are not
part of the implemented domain model inventory.

### Keep the generated guide available

The generated Markdown should be committed so people and agents can browse the
latest domain guide without first running the generator. Its generated status
and owning sources should be clear in the document so nobody edits the derived
content by hand.

Guide generation should be part of the repository build. Verification should
also regenerate the guide and fail when the committed file differs. The
repository already uses this pattern for generated CLI and configuration
documentation through `generate-docs` and `check-generated-docs` targets. The
domain guide should join that lifecycle rather than introduce a separate way of
maintaining generated documentation.

### Make the guide discoverable to agents

The root `AGENTS.md` should reference the generated domain guide. This makes the
team owned view of the current model available to agents which are working on
domain or architecture questions, even when `/ddd` was not explicitly invoked.
Agents working on unrelated tasks do not need to read the guide.

`/ddd` should read the current guide before it frames the domain problem. The
guide is a starting point for inspecting the relevant aggregates, use cases,
and domain services. It is evidence of the implemented model, not proof that
the model is correct.

`/ddd` does not regenerate the guide when invoked. The repository build and
generated documentation checks own regeneration and freshness. Starting a
modelling discussion should therefore remain read only unless the user later
authorises changes.

### Worked guide example: role enforcement

The role enforcement subdomain tests whether the proposed guide contains enough
information to begin discovery. Its domain model package currently has no
description, so real generation should fail until the package owns one. With a
description present, its generated section would have this shape:

```markdown
## Role enforcement

<domain model package description>

### Aggregates

- `RoleEnforcementProject`
  - `execute`

### CLI operations

- Command: `RunRoleEnforcement`
  - Invokes aggregate operation `RoleEnforcementProject.execute`
```

The aggregate relationship is available through the declared return type of
`RoleEnforcementProjectRepository.load`, and the aggregate operation is called
directly in `RunRoleEnforcement`. No wider dependency analysis is needed.

This is enough for `/ddd` to locate the command, aggregate, repository, tests,
and neighbouring domain behaviour with `rg`. The section does not need source
links, role justifications, copied glossary definitions, or a complete domain
service inventory.

The example also confirms the production source filter. Spec files in this
subdomain contain role annotations inside fixture source strings. A broad text
scan would mistake those fixtures for the implemented domain model.

## Role enforcement protects model quality

Rivière role enforcement exists to maintain good architecture. `/ddd` must
treat it as modelling evidence and a quality constraint, not as an obstacle to
implementation.

When code does not fit an existing role cleanly, the first response is to
examine the responsibility, the end to end flow, and the proposed model. The
agent must not make the violation disappear by inventing generic helpers,
managers, orchestrators, services, roles, folders, exemptions, or other escape
hatches.

A new role is not justified because the current code needs somewhere to go. It
would need to represent a real and durable architectural responsibility after
the model and existing roles have been examined. Any change inside `.riviere`
requires explicit user approval.

Before assigning roles, read the role selection guide and the full definitions
for every role under consideration. Role assignment follows responsibility; it
does not create responsibility.

## Examples already captured in project memory

These approved architecture memories contain concrete modelling successes and
failures that should inform the skill without becoming automatic rules:

- [DDD modelling lessons from the Rivière workflow discussion](../../../../project-memory/architecture/memories/ddd-modelling-trade-offs-from-riviere-workflows.md)
  shows how feature nouns, existing abstractions, stage ownership, repository
  behaviour, and misleading names biased the design.
- [Rejected Rivière workflow architecture options](../../../../project-memory/architecture/memories/rejected-workflow-use-case-dumping-case-study.md)
  shows fake alternatives, business logic placed in use cases, unresolved role
  decisions, and domain behaviour disguised as an external client.
- [Repository loading must load the full aggregate](../../../../project-memory/architecture/memories/repository-loading-must-load-full-aggregate.md)
  shows how inputs designed around one command can hide an unresolved aggregate
  boundary.
- [Design query models from concrete queries](../../../../project-memory/architecture/memories/design-query-models-from-concrete-queries.md)
  shows why a read model should begin with the actual user query rather than an
  existing shared repository.
- [Prefer layer based rules](../../../../project-memory/architecture/memories/prefer-layer-based-rules.md)
  shows how enforcement should express real architectural boundaries rather
  than accumulate narrow role lists and exceptions.

Architecture memories are advisory. The agent must retrieve only the memories
which match the current system area and modelling question. Current code,
approved architecture, role definitions, repository conventions, and current
user decisions take precedence.

## Open questions

- How should examples from future modelling discussions be added without
  turning individual lessons into universal rules?
