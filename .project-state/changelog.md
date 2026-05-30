# Changelog — Paperclip

> Generated: 2026-05-13 | Commit: f4bed4a7 | Branch: master
> Versioning: Calendar (YYYY.MDD.P) | Latest: v2026.513.0

## Unreleased

No commits since v2026.513.0. HEAD is at the release tag.

---

## v2026.513.0 — 2026-05-13

### Features
- **[#5603] Blocked inbox attention view** — "Blocked" tab surfaces blocked work with reason chips, urgency sorting, responsive layouts (~3,737 lines)
- **[#5599] Source-scoped recovery actions** — First-class `issue_recovery_actions` records with owner, evidence, wake policy, resolution outcomes (~3,947 lines)
- **[#5821] Local plugin development workflow** — `paperclipai plugin init` scaffolding, local-path installs, dev-watcher, SDK validation (~873 lines)
- **[#5938] Ordered sub-issue navigation** — Previous/next sibling navigation in issue detail footers (~763 lines)

### Fixes
- **[#5919] Comment date binding regression** — Window bounds now bound as ISO strings with `::timestamptz` casts
- **[#5922] Remote sandbox host workspace resumes** — Persist host workspace cwd, reject system roots, skip sockets during restore

### Database Migrations
- `0084_issue_recovery_actions` — New table + indexes (idempotent)

---

## v2026.512.0 — 2026-05-12

**Large release** — 9 DB migrations (`0075`–`0083`), ~40+ commits.

### Features (9 major)
- Planning mode for issues (`work_mode: standard | planning`) [#5353]
- Full company search with fuzzy matching + highlighted snippets [#5293]
- Routine revision history with restore and diff descriptions [#5285]
- Successful-run handoff and system notices [#5289]
- Expanded plugin host surface (DB namespaces, local folders, managed agents/routines) [#5205, #5597]
- LLM Wiki plugin package [#5716]
- Secrets provider vaults with remote import (AWS Secrets Manager) [#5429]
- Cursor cloud adapter (`cursor_cloud`) via `@cursor/sdk` [#5664]
- ACPX local adapter (in-process Claude/Codex) [#4893, #5290]

### Fixes (14+)
- Codex CLI 0.122+ authentication [#5276]
- Gemini CLI v0.38 stream-json format [#5273]
- Stop leaking host environment into remote probes [#5142]
- SSH callback URL selection on LAN/private networks [#4799]
- Runtime races and orphaned leases [#4804]
- Cloud tenant issue identifier routes [#5196]
- Message attribution for agent-posted comments [#5780]

---

## v2026.428.0 — 2026-04-28

4 DB migrations (`0071`–`0074`).

### Features
- Pause/resume agents from sidebar [#4616]
- Productivity review service (auto-review for stalled agents) [#4700]
- Virtualized long issue threads [#4701]

---

## v2026.427.0 — 2026-04-27

**Largest release** — 14 DB migrations (`0057`–`0070`).

### Features
- Multi-user access and invite flows [#3784]
- Structured issue-thread interactions (suggested tasks, Q&A forms, confirmation cards) [#4244]
- Run liveness continuations and active-run watchdog [#4083]
- Sub-issues as workflow checklist [#4523]
- Issue subtree pause/cancel/restore [#4332]
- First-class issue references (`PAP-123` mentions) [#4214]
- BETA: Environments and pluggable sandbox providers [#4297]

### Security
- API route authorization hardening [#4122]

---

## v2026.416.0 — 2026-04-16

8 DB migrations (`0049`–`0056`). Foundation release.

### Features
- Issue chat thread (assistant-ui powered) [#3079]
- Execution policies (review/approval multi-stage signoff) [#3222]
- Blocker dependencies with wake-on-resolved [#2797]
- BETA: Standalone MCP server (`@paperclipai/mcp-server`) [#2435]
- Issue search (trigram-indexed full-text) [#2999]

### Security — GHSA-68qg-g8mg-6pr7
- Authorization hardening, JWT secret hardening, dependency bumps

---

## Release Cadence

| Release | Date | DB Migrations | Scale |
|---|---|---|---|
| v2026.513.0 | 2026-05-13 | 1 | 6 commits |
| v2026.512.0 | 2026-05-12 | 9 | ~40+ commits |
| v2026.428.0 | 2026-04-28 | 4 | ~10 commits |
| v2026.427.0 | 2026-04-27 | 14 | ~40+ commits |
| v2026.416.0 | 2026-04-16 | 8 | ~60+ commits |
