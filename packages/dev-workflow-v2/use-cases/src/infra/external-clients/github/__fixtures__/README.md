# Installed CodeRabbit status evidence

These are public GitHub REST payloads captured on 2026-09-06. Field values are preserved; whitespace may be reformatted. Tests wrap each response in an outer array to match `gh api --paginate --slurp`.

| Fixture                        | Repository and PR                            | Head                                       | Observation                                                                                                                                                  |
| ------------------------------ | -------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `coderabbit-initial.json`      | `NTCoding/living-architecture` #525          | `a3333250757fdbb57133090131abd44a62bfd60c` | First submitted review, review ID `5121176659`, requested changes. Status `53597459425` says `Review completed`.                                             |
| `coderabbit-no-findings.json`  | `NTCoding/living-architecture` #527          | `0a6189befc968025e8afd3cba4f449bbdedc26a1` | Its only submitted review, ID `5121836536`, is APPROVED with an empty body. Status `53602067177` says `Review completed`.                                    |
| `coderabbit-incremental.json`  | `NTCoding/living-architecture` #525          | `494915f01c69da8054a689ab8317a6388d90bb78` | Subsequent head and review ID `5121442980`, after the initial changes request, is APPROVED with an empty body. Status `53599666567` says `Review completed`. |
| `coderabbit-rate-limited.json` | `NTCoding/deterministic-agent-workflows` #44 | `24bf0adec792b07c3118ff956be7c09e35cd6ef5` | Status `53612662582` says `Review rate limited`, despite its GitHub state being `success`.                                                                   |

Source endpoints:

- `GET /repos/{owner}/{repository}/commits/{head}/statuses`
- `GET /repos/{owner}/{repository}/pulls/{number}/reviews` for the review observations above

The configured installation reports numeric bot identity `136622811`, node identity `BOT_kgDOCCSy2w`, and actor type `Bot`. Display logins are not identity. The adapter requires all three identity fields and an evidence URL bound to the exact repository and head.

Only the demonstrated terminal description `Review completed` counts as completion. `Review approved` can precede that status and is not accepted as completion. Pending work, unknown descriptions, malformed output, an unknown source, or mismatched revision evidence cannot establish readiness. An empty thread list or a comment mentioning CodeRabbit cannot establish either completion or rate limiting.

Verified rate-limit evidence is retained even if a later status on the same head reports completion. The workflow still needs to persist the PR-wide skip decision across subsequent heads; that lifecycle policy is separate from this client.

This contract is specific to the observed GitHub.com installation. A different installation or changed provider identity/protocol requires new verified evidence rather than fallback to login matching.

## Required-check evidence

`required-checks-rules.json` and `required-checks-rollup.json` were captured from `NTCoding/living-architecture` #528 at head `693704806dd233247def5af3e220e9fea8580b4f`. The rules endpoint is `GET /repos/NTCoding/living-architecture/rules/branches/main`.

The GraphQL response records `RequiredStatusCheckDescription.app`, `CheckRun.checkSuite.app`, and `isRequired(pullRequestNumber: 528)` for checks on the exact commit. The branch has no classic protection rule; the required checks come from repository rulesets. CodeRabbit appears as a `StatusContext`, not a `CheckRun`. GitHub's required-status result is distinct from verified CodeRabbit review completion or its durable rate-limit skip.
