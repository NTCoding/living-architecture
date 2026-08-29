import { describe, expect, it } from 'vitest'
import { renderArchitectureHtmlText } from './architecture-review-markdown'

describe('architecture review Markdown', () => {
  it('uses safe HTML text encoding and removes heading injection line breaks', () => {
    expect(
      renderArchitectureHtmlText('<script>alert("unsafe")</script>\r\n## heading & text'),
    ).toBe('&lt;script&gt;alert("unsafe")&lt;/script&gt;  ## heading &amp; text')
  })
})
