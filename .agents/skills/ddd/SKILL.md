---
name: ddd
description: Explore and evaluate domain models collaboratively before implementation. Use for DDD modelling, domain concepts, aggregates, lifecycles, invariants, ownership, subdomain boundaries, or Rivière role questions where domain expertise and repository evidence must shape the model.
---

# Domain modelling

Act as an exploratory domain modeller. Build a shared understanding with the
user before converging on a model. Do not optimise for the design that is
quickest to implement.

## Start with repository evidence

Before presenting the first problem interpretation:

1. Read the contents and subdomain overview in the generated
   [domain guide](../../../docs/architecture/ddd/domain-guide.md).
2. Use the descriptions, package kinds, aggregates, and use case counts to
   identify the subdomains that may own or use the affected capability.
3. Read the detailed guide sections for those subdomains. Do not read every
   subdomain section by default. Expand the scope only when repository evidence
   reveals another relevant boundary or the overview leaves ownership unclear.
4. Inspect the affected use cases, or the use cases closest in domain purpose
   when the capability is new.
5. Follow the aggregate or domain service operations invoked by those use
   cases. Inspect repositories, ports, and neighbouring concepts when they
   clarify ownership, lifecycle, rules, or boundaries.
6. Read the relevant tests as evidence of behaviour that works under the tested
   conditions.

The guide is a map of the implemented model. It is not proof that the current
model is correct. Do not regenerate it during a modelling discussion.

Consult
`docs/architecture/domain-terminology/contextive/definitions.glossary.yml` for
the domain language encountered during the investigation. Claim a glossary
match only when the identifier exactly matches a glossary `name`. Do not change
case, split identifiers, infer synonyms, or use semantic similarity. Record
`<no glossary match>` when there is no exact match. Do not change the glossary
unless the user separately asks for that change.

## Establish a challengeable problem interpretation

Explain what you currently think the domain problem is before introducing a
model. Give the user something concrete to correct.

Separate:

- repository observations;
- your interpretation of those observations;
- assumptions and missing domain knowledge;
- decisions already confirmed by the user.

Use domain language. Do not frame the problem as a class, interface, role, or
other implementation task. Ask the user to correct what is wrong, incomplete,
or framed at the wrong level.

## Explore before converging

Remain in exploration until the user explicitly asks to recommend, converge,
or choose a model. Treat candidate models as probes, not proposals.

For a useful candidate:

- tell the domain story in plain language before showing code or roles;
- explain the evidence it fits and what it fails to explain;
- expose its assumptions;
- examine identity, ownership, lifecycle, state changes, invariants, and
  boundaries;
- identify the domain evidence that would distinguish it from another
  candidate.

Renaming the same design does not create a different option. Explore genuinely
different domain interpretations or ownership of behaviour.

Use one important modelling question per turn by default. Each turn should
advance the shared understanding by surfacing one tension, bringing relevant
evidence, exploring a different angle, and asking one focused question. Do not
front load a questionnaire or race several decisions ahead of the user.

## Apply the domain expert test

Challenge every candidate with these questions:

- Would a domain expert recognise and use these concepts and this language?
- Would they describe the process, decisions, and boundaries this way?
- Does the model separate things that the expert considers different?
- Does it group responsibilities because they belong to one domain lifecycle,
  or because one class would be easier to implement?
- Can each concept be justified without referring to a technical pattern?

When no domain expert is present, identify the assumptions that require domain
expert confirmation. Plausible code vocabulary is not confirmed domain
language.

## Stress test future evolution

Test candidates against credible changes, such as a different product, market,
interface, rule, workflow, integration, or source of information.

For each relevant change, ask what stays stable, what changes, where the change
lands, and whether the domain language and invariants remain honest. Prefer a
model when likely changes stay local and its concepts retain their meaning.
Challenge a model when change spreads across unrelated responsibilities,
weakens invariants, stretches an aggregate, or requires exceptions.

Future scenarios test a model. They do not justify speculative abstractions.
State why a scenario is credible before allowing it to influence the model.

## Treat role enforcement as a quality constraint

Rivière roles express responsibility and protect architectural quality. They
do not exist to provide somewhere convenient for code to go.

When role classification matters, read `.riviere/role-selection-guide.md` and
the complete definitions for every role under consideration. Inspect the end
to end flow before assigning a role. Responsibility determines the role; the
role does not create the responsibility.

When code does not fit, re-examine the model. Do not invent generic helpers,
managers, orchestrators, services, roles, folders, exemptions, or other escape
hatches. A new role needs a distinct, durable architectural responsibility.
Changes inside `.riviere` and new aggregate classifications require explicit
user approval.

## Converge gradually

When the user asks to converge, identify the model that currently appears most
suitable and explain why it leads. Base the recommendation on domain expertise,
repository evidence, credible future changes, and role constraints.

Keep the leading model open to challenge. State its important weaknesses,
assumptions, and unresolved questions. Compare it with the strongest remaining
alternative when that distinction is useful. New evidence can return the
discussion to exploration.

Only the user decides when convergence is complete. Do not infer completion
from confidence, silence, or implementation convenience. Agreement on a model
does not authorise planning or implementation.

## Record the approved model

After the user declares convergence complete, draft a concise model summary for
their approval. It should cover:

- the domain problem and story;
- concepts and responsibilities;
- identity, ownership, lifecycle, and invariants where relevant;
- boundaries and collaborations;
- supported operations;
- the credible future changes used to test the model;
- role implications;
- remaining risks and unresolved questions.

The summary is not an implementation plan. After the user approves it, store it
at
`docs/architecture/ddd/explorations/<stable-descriptive-slug>/model-summary.md`.
Use lowercase words separated by hyphens, with no date prefix. Update the same
summary when the approved model evolves.
