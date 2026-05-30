# Audit — Paperclip

> Generated: 2026-05-13 | Commit: f4bed4a7 | Branch: master

## Project Classification

| Field | Value |
|---|---|
| **Name** | Paperclip (`paperclipai`) |
| **Type** | pnpm monorepo (15 workspace packages) |
| **Platform** | Server (Node.js) + Web UI + CLI |
| **Stack** | TypeScript 5.7, Express 5, React 19, Vite 6, Drizzle ORM, PostgreSQL |
| **Architecture** | AI agent orchestration control plane — heartbeat-driven execution, pluggable adapters, company-scoped multi-tenancy |
| **License** | MIT |
| **Versioning** | CalVer (YYYY.MDD.P) — latest: v2026.513.0 |

## Repository Stats

| Metric | Value |
|---|---|
| Total commits | 2,463 |
| Source files (TS/TSX) | 1,644 |
| Lines of code | ~490,727 |
| Test files | 507 (496 `.test.*` + 11 `.spec.*`) |
| Markdown files | 249 |
| SQL migrations | 85 (+ 4 sandbox provider plugin migrations) |
| Release tags | 10 (v0.3.0 → v2026.513.0) |

## Git State

- **Branch**: master (clean, up to date with origin)
- **Last commit**: `f4bed4a7` — Release changelog v2026.513.0 (#5944) — 2026-05-13
- **Remotes**: origin (SkafldStudio-Clients/paperclip), upstream (paperclipai/paperclip)
- **Working tree**: Clean — no uncommitted changes

## Workspace Packages

| Package | Path | Purpose |
|---|---|---|
| `@paperclipai/server` | `server/` | Express REST API + orchestration engine |
| `@paperclipai/ui` | `ui/` | React + Vite board UI |
| `paperclipai` (CLI) | `cli/` | CLI tooling (`npx paperclipai`) |
| `@paperclipai/db` | `packages/db/` | Drizzle ORM schema + migrations |
| `@paperclipai/shared` | `packages/shared/` | Shared types, constants, Zod validators |
| `@paperclipai/adapter-utils` | `packages/adapter-utils/` | Shared adapter utilities |
| `@paperclipai/mcp-server` | `packages/mcp-server/` | MCP server (40 tools) |
| `@paperclipai/plugin-sdk` | `packages/plugins/sdk/` | Plugin SDK |
| `@paperclipai/plugin-llm-wiki` | `packages/plugins/plugin-llm-wiki/` | LLM Wiki plugin |
| Adapters (9) | `packages/adapters/*` | claude, codex, acpx, cursor, cursor-cloud, gemini, openclaw, opencode, pi |
| Sandbox providers (4) | `packages/plugins/*` | cloudflare, e2b, daytona, exe.dev |

## Services & Configuration

### Internal Services
| Service | Port | Description |
|---|---|---|
| Paperclip API | 3100 | Express REST API + WebSocket live events |
| Embedded PostgreSQL | 54329 | PGlite for development (auto-managed) |
| Vite HMR | 13100 | UI hot module replacement (dev only) |

### External Services (optional)
| Service | Config | Purpose |
|---|---|---|
| PostgreSQL | `DATABASE_URL` | Production database |
| AWS S3 | `PAPERCLIP_STORAGE_PROVIDER=s3` | Asset storage |
| AWS Secrets Manager | `PAPERCLIP_SECRETS_PROVIDER=aws_secrets_manager` | Secret management |
| Anthropic API | `ANTHROPIC_API_KEY` | Claude adapter |
| OpenAI API | `OPENAI_API_KEY` | Codex adapter |
| Google API | `GEMINI_API_KEY` | Gemini adapter |

### Environment Variables (from .env.example)
- `DATABASE_URL` — External PostgreSQL connection string
- `PORT` — Server port (default: 3100)
- `SERVE_UI` — Whether to serve UI from API server
- `BETTER_AUTH_SECRET` — Authentication secret

## Key Dependencies

| Dependency | Version | Purpose |
|---|---|---|
| express | ^5.1.0 | HTTP server framework |
| drizzle-orm | ^0.45.2 | Database ORM |
| better-auth | 1.4.18 | Authentication |
| react | ^19.0.0 | UI framework |
| @tanstack/react-query | ^5.90.21 | Data fetching |
| @assistant-ui/react | 0.12.23 | Chat thread UI |
| vite | ^6.1.0 | Build tool |
| vitest | ^3.0.5 | Test framework |
| @playwright/test | ^1.58.2 | E2E testing |
| tailwindcss | ^4.0.7 | CSS framework |
| typescript | ^5.7.3 | Type system |
| esbuild | ^0.27.3 | CLI bundler |
| ws | (latest) | WebSocket server |
| pino | ^9.6.0 | Logging |
| zod | (latest) | Schema validation |
