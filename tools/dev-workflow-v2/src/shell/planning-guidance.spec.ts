import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

const readPluginFile = (path: string): string => readFileSync(join(pluginRoot, path), 'utf8')

describe('planning guidance acceptance criteria', () => {
  it('requires accepted terminology, samples, role change, and acceptance criteria guidance', () => {
    const taskCreation = readPluginFile('planning-stages/task-creation.md')
    const prdDrafting = readPluginFile('planning-stages/prd-drafting.md')
    const architectureDrafting = readPluginFile('planning-stages/architecture-drafting.md')
    const deliveryPlanning = readPluginFile('planning-stages/delivery-planning.md')
    const terminologyRules = [
      'A term is defined once, in the terminology source.',
      'The terminology source is the PRD terminology section, or `docs/architecture/domain-terminology/contextive/definitions.glossary.yml`.',
      'Use a term as the terminology source defines it. Do not write a second definition.',
      'Do not introduce a term that is not in the terminology source. Add it to the terminology source first.',
      'Do not invent language for something that already has a name.',
    ]
    const sampleRules = [
      'Introduce every code, configuration, or flow sample with a sentence that says what the file is, who writes it, where it lives, and whether it is the whole file or part of a file.',
      'Keep the sample as it appears in the source. Do not shorten it.',
    ]
    const criteriaRules = [
      'Every criterion has two parts, in this order.',
      'A rule states the behaviour. A rule contains no values and no file contents.',
      'An example is one case. Write it in Gherkin.',
      '- `Given` states a pre-condition.',
      '- `When` states an action.',
      '- `Then` describes the result.',
    ]
    expect({
      prdDraftingHasTerminologyRules: terminologyRules.every((rule) => prdDrafting.includes(rule)),
      architectureDraftingHasTerminologyRules: terminologyRules.every((rule) =>
        architectureDrafting.includes(rule),
      ),
      architectureDraftingHasSampleRules: sampleRules.every((rule) =>
        architectureDrafting.includes(rule),
      ),
      deliveryPlanningHasCriteriaRules: criteriaRules.every((rule) =>
        deliveryPlanning.includes(rule),
      ),
      taskCreationHasCriteriaRules: criteriaRules.every((rule) => taskCreation.includes(rule)),
      taskCreationHasSolutionFitRule: taskCreation.includes(
        'State how this capability fits with the neighbouring capabilities: which stage or command runs immediately before it, which runs immediately after it, and what this capability contributes that they do not.',
      ),
      taskCreationHasRoleChangeColumn: taskCreation.includes(
        '| Proposed Element | Kind | Role | Sublocation | Change | Confidence | Notes |',
      ),
      architectureDraftingHasRoleChangeColumn: architectureDrafting.includes(
        'Its value is one of `new`, `changed`, `removed`, or `unchanged`.',
      ),
      taskCreationCopiesDefinedTerms: taskCreation.includes(
        'copy into the issue every term that the terminology source defines and that appears in the issue body',
      ),
      taskCreationBlocksScenarioWord: taskCreation.includes('a criterion uses the word `scenario`'),
      taskCreationBlocksMissingGlossaryTerm: taskCreation.includes(
        'a term defined by the terminology source appears in the issue body but is missing from `## Glossary`',
      ),
      taskCreationBlocksUndefinedTerm: taskCreation.includes(
        'the issue uses a term that the terminology source does not define',
      ),
      taskCreationBlocksUndescribedSample: taskCreation.includes(
        'a code or configuration sample has no sentence saying what the file is, who writes it, where it lives, and whether it is whole or part of a file',
      ),
      showsWorkedCriteriaExample: taskCreation.includes(
        '**Rule:** EventCatalog services are added as `UseCase` components in a Riviere graph.',
      ),
      showsRealComponentValues: taskCreation.includes('"id": "orders:checkout:usecase:placeorder"'),
    }).toStrictEqual({
      prdDraftingHasTerminologyRules: true,
      architectureDraftingHasTerminologyRules: true,
      architectureDraftingHasSampleRules: true,
      deliveryPlanningHasCriteriaRules: true,
      taskCreationHasCriteriaRules: true,
      taskCreationHasSolutionFitRule: true,
      taskCreationHasRoleChangeColumn: true,
      architectureDraftingHasRoleChangeColumn: true,
      taskCreationCopiesDefinedTerms: true,
      taskCreationBlocksScenarioWord: true,
      taskCreationBlocksMissingGlossaryTerm: true,
      taskCreationBlocksUndefinedTerm: true,
      taskCreationBlocksUndescribedSample: true,
      showsWorkedCriteriaExample: true,
      showsRealComponentValues: true,
    })
  })
})
