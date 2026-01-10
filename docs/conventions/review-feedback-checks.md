# Review Feedback Checks

Patterns learned from external review feedback (e.g., CodeRabbit). Any PR feedback requiring code changes represents a process failure that should be caught locally in future PRs.

## How to Use This File

**Bug-scanner** reads this file and applies each check to changed code.

**Post-merge completion** updates this file when PR feedback reveals a generalizable pattern.

---

## RFC-001: Documentation-to-Code Consistency

**Source:** PR #115 (CodeRabbit)

**Pattern:** Documentation claims a script/function handles multiple types but implementation only handles one.

**Example (BAD):**
```markdown
Use `create-tech-improvement-task.sh` to create non-milestone tasks (applies appropriate label)
```
But script only creates tech improvements with hardcoded label.

**Example (GOOD):**
```markdown
Use `create-non-milestone-task.sh --type <idea|bug|tech>` to create non-milestone tasks
```
Script accepts type parameter and applies corresponding label.

**Detection:** When docs reference a script/command, verify the described behavior matches actual implementation.

---

## RFC-002: User-Friendly Display Names

**Source:** PR #115 (CodeRabbit)

**Pattern:** Raw internal values (enums, labels, keys) displayed to users instead of formatted names.

**Example (BAD):**
```bash
echo "Non-milestone tasks: $NON_MILESTONE_LABEL"
# Outputs: "Non-milestone tasks: idea"
```

**Example (GOOD):**
```bash
case "$NON_MILESTONE_LABEL" in
    idea) LABEL_DISPLAY="Ideas" ;;
    bug) LABEL_DISPLAY="Bugs" ;;
    "tech improvement") LABEL_DISPLAY="Tech Improvements" ;;
esac
echo "Non-milestone tasks: $LABEL_DISPLAY"
# Outputs: "Non-milestone tasks: Ideas"
```

**Detection:** User-facing echo/print statements should not output raw enum/label values.

---

## RFC-003: Query Filtering Completeness

**Source:** PR #115 (CodeRabbit)

**Pattern:** Query for a category but doesn't explicitly exclude what shouldn't match.

**Example (BAD):**
```bash
# Query for non-milestone tasks but might return issues WITH milestones
gh issue list --label "idea" --state open
```

**Example (GOOD):**
```bash
# Explicitly exclude milestone issues
gh issue list --label "idea" --milestone "" --state open
```

**Detection:** When querying for a subset (e.g., "non-milestone"), verify exclusion filters are explicit.

---

## Adding New Checks

When external review feedback reveals a pattern:

1. Create a new section with ID `RFC-NNN`
2. Document: Source PR, Pattern, Bad/Good examples, Detection guidance
3. Bug-scanner will apply the check to future PRs
