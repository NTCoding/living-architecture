import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { renderDomainGuide } from './domain-guide/domain-guide-markdown'
import { inspectSubdomains } from './domain-guide/domain-guide-source'

const workspaceRoot = process.cwd()
const outputPath = path.join(workspaceRoot, 'docs/architecture/ddd/domain-guide.md')
writeFileSync(outputPath, renderDomainGuide(inspectSubdomains(workspaceRoot)), 'utf8')
