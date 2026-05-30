# CLAUDE.md — Project Context
<!-- PROJECT_STATE: commit=f4bed4a7 timestamp=2026-05-13T23:59:00Z health=86 -->

## Project Identity
- **Name**: Paperclip (`paperclipai`)
- **Type**: pnpm monorepo (15 workspace packages)
- **Platform**: Server (Node.js) + Web UI + CLI
- **Stack**: TypeScript 5.7, Express 5, React 19, Vite 6, Drizzle ORM, PostgreSQL
- **Architecture**: AI agent orchestration control plane — heartbeat-driven execution, pluggable adapters, company-scoped multi-tenancy
- **Health**: 86/100 (yellow — no linter configured)

## Development Commands
```bash
# Setup
pnpm install

# Dev (API + UI, watch mode)
pnpm dev

# Test (Vitest, fast)
pnpm test

# Typecheck entire monorepo
pnpm -r typecheck

# Build all packages
pnpm build

# E2E tests (Playwright)
pnpm test:e2e

# Database migrations
pnpm db:generate    # Generate from schema changes
pnpm db:migrate     # Apply migrations

# Pre-handoff check
pnpm -r typecheck && pnpm test:run && pnpm build
```

## Core Invariants
1. **Single-assignee task model** — one agent per issue
2. **Atomic issue checkout** — prevents double-work
3. **Approval gates** — governed actions require board approval
4. **Budget hard-stop** — auto-pause on budget exceeded
5. **Activity logging** — all mutating actions audit-logged
6. **Company-scoped isolation** — every entity scoped to a company

## Key Patterns
- **Services**: Factory functions taking `Db`, not classes
- **Validation**: Zod schemas from `@paperclipai/shared` (source of truth)
- **Auth**: `req.actor` resolved as board or agent; `assertCompanyAccess()` on every route
- **Realtime**: WebSocket at `/api/companies/:id/events/ws`
- **Adapters**: `ServerAdapterModule` interface in `packages/adapter-utils/src/types.ts`
- **Plugins**: JSON-RPC 2.0 over stdio, capability-gated, forked child processes

## Active Issues (Critical)
1. **#5917** — Comments 500: Date objects passed to postgres.js (regression in 2026.512.0)
2. **#5916** — Plugin tools always 502: `registerPluginTools` drops UUID dbId (2-line fix)
3. **#5935** — Self-perpetuating wake-loop: agent's own comments trigger re-wakes
4. **#5945** — `setUserCompanyAccess` skips permission grants
5. **#5950** — Embedded PostgreSQL permission denied on macOS

## Next Action
Fix the comment 500 regression (#5917) — one-line fix in `enrichCommentsWithDerivedAgentAttribution`, call `.toISOString()` on date params.

## Full Context
For detailed audit, health scorecard, roadmap, and changelog, see `.project-state/`:
- `.project-state/audit.md` — Full discovery findings, services, dependencies
- `.project-state/structure.md` — Annotated directory map with purpose index
- `.project-state/health.md` — Structural health scorecard (86/100)
- `.project-state/roadmap.md` — Reconciled roadmap with 25 prioritized items
- `.project-state/changelog.md` — Changelog across 5 CalVer releases
