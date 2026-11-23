import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { PlanningFolders } from '../../queries/planning-folders'

/**
 * @riviere-role query-model-loader
 *
 * The folders the factory reads its epics and its ideas from. The board needs all of them at once,
 * and a folder only counts when it holds the file that names it.
 */
export class PlanningFoldersLoader {
  constructor(private readonly targetRepo: string) {}

  load(): PlanningFolders {
    return {
      epics: slugsIn(join(this.targetRepo, 'docs', 'project', 'PRD'), 'epic.yml'),
      ideas: slugsIn(join(this.targetRepo, 'project-memory', 'ideas'), 'idea.md'),
    }
  }
}

function slugsIn(folder: string, file: string): readonly string[] {
  try {
    return readdirSync(folder, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(folder, entry.name, file)))
      .map((entry) => entry.name)
      .filter((name) => /^[a-z0-9-]+$/.test(name))
  } catch {
    return []
  }
}
