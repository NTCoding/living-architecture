import { describe, expect, it } from 'vitest'
import { renderPlanningDocument } from './render-planning-document'

const document = [
  '# The problem',
  '',
  'Real systems span several repositories.',
  '',
  '## Should a link fail the merge?',
  '',
  ':::decision d-1',
  'proposal: Report the link.',
  'alternative: Fail the merge.',
  'pick: proposal.',
  ':::',
  '',
  '![A graph](graph.png)',
].join('\n')

describe('renderPlanningDocument', () => {
  it('renders the headings and the paragraphs', () => {
    const html = renderPlanningDocument(document)

    expect(html).toContain('<h1')
    expect(html).toContain('The problem')
    expect(html).toContain('<p')
    expect(html).toContain('Real systems span several repositories.')
  })

  it('gives each top level block the lines it came from', () => {
    const html = renderPlanningDocument(document)

    expect(html).toContain('data-lines="1-1"')
    expect(html).toContain('data-lines="3-3"')
    expect(html).toContain('data-lines="5-5"')
  })

  it('leaves a placeholder where a decision sits', () => {
    const html = renderPlanningDocument(document)

    expect(html).toContain('<div class="decision" data-decision="d-1"></div>')
  })

  it('does not render the decision fields as text', () => {
    expect(renderPlanningDocument(document)).not.toContain('alternative: Fail the merge.')
  })

  it('renders a html block as a sandboxed frame', () => {
    const html = renderPlanningDocument(':::html\n<div>a diagram</div>\n:::')

    expect(html).toContain('<iframe class="html-block" sandbox')
    expect(html).toContain('data-html="&lt;div&gt;a diagram&lt;/div&gt;"')
  })

  it('renders an agent note as an aside', () => {
    const html = renderPlanningDocument(':::agent-note\nRead this first.\n:::')

    expect(html).toContain('<aside class="agent-note">')
    expect(html).toContain('Read this first.')
  })

  it('renders nothing for an empty document', () => {
    expect(renderPlanningDocument('')).toBe('')
  })

  it('keeps the text after a named block', () => {
    const html = renderPlanningDocument(
      'One paragraph.\n\n:::html\n<b>x</b>\n:::\n\nTwo paragraphs.',
    )

    expect(html).toContain('One paragraph.')
    expect(html).toContain('Two paragraphs.')
  })

  it('keeps a named block that is never closed', () => {
    expect(renderPlanningDocument(':::html\n<b>x</b>')).toContain('<iframe class="html-block"')
  })

  it('escapes html in the document text', () => {
    const html = renderPlanningDocument('A paragraph with <b>tags</b> in it.')

    expect(html).toContain('&lt;b&gt;tags&lt;/b&gt;')
  })

  it('marks only the outermost block of a list', () => {
    const html = renderPlanningDocument('- one\n- two')

    expect(html).toContain('<ul data-lines="1-2">')
    expect(html).not.toContain('<li data-lines')
  })

  it('takes the language from a fence whose info has extra words', () => {
    const html = renderPlanningDocument('```ts title="a.ts"\nconst a = 1\n```')

    expect(html).toContain('class="language-ts"')
  })

  it('renders a fenced code block with no language', () => {
    const html = renderPlanningDocument('```\nplain code\n```')

    expect(html).toContain('<code>plain code')
    expect(html).not.toContain('class="language-')
  })

  it('names the language of a fenced code block', () => {
    const html = renderPlanningDocument('```ts\nconst a = 1\n```')

    expect(html).toContain('<code class="language-ts">')
    expect(html).toContain('data-lines="1-3"')
  })
})
