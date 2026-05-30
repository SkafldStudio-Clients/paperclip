# Roadmap Reconciliation — Paperclip

> Generated: 2026-05-13 | Commit: f4bed4a7 | Branch: master
> Source: ROADMAP.md + 30 open GitHub issues + inline TODOs

## Reconciled Items

| # | Item | Source | Status | Evidence | Priority |
|---|---|---|---|---|---|
| 1 | Plugin System | ROADMAP.md | **Done** | 20+ service files, SDK, CLI, 5 plugins | — |
| 2 | OpenClaw agents | ROADMAP.md | **Done** | `openclaw-gateway` adapter | — |
| 3 | Company import/export | ROADMAP.md | **Done** | `company-portability.ts`, CLI, UI pages | — |
| 4 | AGENTS.md configurations | ROADMAP.md | **Done** | Root AGENTS.md, instructions bundle system | — |
| 5 | Skills Manager | ROADMAP.md | **Done** | Company skills CRUD, plugin-managed skills | — |
| 6 | Scheduled Routines | ROADMAP.md | **Done** | Full CRUD with triggers, cron, variables | — |
| 7 | Better Budgeting | ROADMAP.md | **Done** | Finance service, budget policies, cost events | — |
| 8 | Agent Reviews & Approvals | ROADMAP.md | **Done** | Full approval lifecycle, execution policies | — |
| 9 | Multiple Human Users | ROADMAP.md | **Done** | Invites, roles, shared access | — |
| 10 | Cloud/Sandbox agents | ROADMAP.md | **Active** | Sandbox runtime, 4 provider plugins, cursor-cloud adapter. UI gated behind experimental flag. | High Value |
| 11 | Artifacts & Work Products | ROADMAP.md | **Active** | Backend service complete. No UI surface. | High Value |
| 12 | Memory / Knowledge | ROADMAP.md | **Relevant** | No core implementation. LLM Wiki plugin exists (broken install). | Defer |
| 13 | Enforced Outcomes | ROADMAP.md | **Relevant** | Outcome enum values exist but no artifact-linked enforcement. | Defer |
| 14 | MAXIMIZER MODE | ROADMAP.md | **Relevant** | No code. Vision item. | Defer |
| 15 | Deep Planning | ROADMAP.md | **Relevant** | `planning` work mode scaffold exists. | Defer |
| 16 | Work Queues | ROADMAP.md | **Relevant** | No implementation. | Defer |
| 17 | Self-Organization | ROADMAP.md | **Relevant** | No implementation. | Defer |
| 18 | Automatic Org Learning | ROADMAP.md | **Relevant** | No implementation. Requires Memory first. | Defer |
| 19 | CEO Chat | ROADMAP.md | **Relevant** | No code. Design proposal in #5948. Most-requested feature. | Nice to Have |
| 20 | Cloud Deployments | ROADMAP.md | **Relevant** | Docker/ECS infra exists. No managed hosting product. | Defer |
| 21 | Desktop App | ROADMAP.md | **Relevant** | No code. | Defer |

## Prioritized Next Steps

### Critical Path (unblocks other work)

1. **Fix comment 500 regression (#5917)** — Comments broken in current release. Call `.toISOString()` on date params in `enrichCommentsWithDerivedAgentAttribution`. One-line fix.

2. **Fix heartbeat self-wake loop (#5935)** — Agent's own comments trigger re-wake at sub-minute cadence. Runaway token spend. Filter `comment_added` wakes when author == assignee.

3. **Fix plugin tool 502 (#5916)** — Two-line fix: pass `pluginDbId` through `registerPluginTools()`. Every plugin's tools are broken.

4. **Fix `setUserCompanyAccess` permissions gap (#5945)** — Users silently receive no role grants. Multi-user companies unusable.

5. **Fix embedded PostgreSQL on macOS (#5950)** — First-run install fails. Blocks new Mac users.

6. **Fix API JSON error envelope (#5956)** — HTML 5xx responses crash agent JSON parsers.

### High Value (significant improvement)

7. **Implement plugin SSE stream route (#5879)** — `usePluginStream` SDK hook exists but server route returns 501.

8. **Fix orchestration/recovery loops (#5906, #5937, #5914)** — Multiple loop classes: recovery creates siblings that re-trigger recovery; review blockers don't re-enter review. Address scoping + state machine together.

9. **Ship Work Products UI** — Backend complete (`work-products.ts`). Add `WorkProducts.tsx` page + issue detail integration.

10. **Ungate issue worktree UI** — Set `SHOW_EXPERIMENTAL_ISSUE_WORKTREE_UI = true` after sandbox hardening is confirmed stable.

11. **Fix `issue_assigned` wake payload (#5844)** — Agents miss issue description. Payload enrichment fix.

12. **Fix `acpx_local` missing runtime dep (#5932)** — Add `claude-agent-acp` dependency.

### Nice to Have

13. **CEO Chat (#5948)** — Most-requested feature. Well-specified design exists.
14. **Restore agent skills tab** — `AgentDetail.tsx:882` TODO.
15. **Fix LLM Wiki install (#5878)** — Migration SQL fix.
16. **Fix activity `?since=` param (#5893)** — Performance fix.
17. **Default issue status to `todo` (#5868)** — Ergonomic.

### Defer

18. Memory/Knowledge — No foundation. Wait for community signal.
19. MAXIMIZER MODE — Vision item. Fix stability first.
20. Self-Organization — High-risk without stronger governance.
21. Automatic Org Learning — Requires Memory prerequisite.
22. Desktop App — No demand signal.
23. Cloud Deployments — Business infrastructure, not code.
24. Work Queues — No immediate user demand.
25. Deep Planning — Scaffold exists, layer incrementally.

## Inline TODOs

| File | Line | TODO | Recommendation |
|---|---|---|---|
| `ui/src/adapters/runtime-json-fields.tsx` | 5 | `TODO(issue-worktree-support)` — worktree UI disabled | Ungate when sandbox hardening confirmed |
| `ui/src/pages/AgentDetail.tsx` | 882 | `// TODO: bring back later` — skills tab removed | Restore (low effort) |
| `cli/src/commands/client/company.ts` | 383 | Adapter selection falls back to `claude_local` | Replace with full TUI adapter selection |
