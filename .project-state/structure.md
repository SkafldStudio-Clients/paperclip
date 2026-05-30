# Directory Structure — Paperclip

> Generated: 2026-05-13 | Commit: f4bed4a7 | Depth: 4 levels
> Total directories: ~180 (excluding noise)

## Annotated Tree

```
paperclip/
├── .agents/skills/                     # Maintainer-level agent skills (release, PR review, doc maintenance) [Active]
├── .claude/skills/design-guide/        # Claude Code UI design system skill [Stable]
├── .github/                            # CI/CD and project governance [Active]
│   ├── workflows/                      # 6 GitHub Actions (pr, release, docker, e2e, smoke, lockfile) [Active]
│   ├── CODEOWNERS                      # Release infra requires @cryppadotta + @devinfoley review [Stable]
│   └── PULL_REQUEST_TEMPLATE.md        # PR template with thinking path requirement [Stable]
├── .project-state/                     # Generated status files (audit, health, roadmap, changelog) [Generated]
├── cli/                                # CLI package — `npx paperclipai` [Active]
│   └── src/                            # Commander.js commands, config, auth, checks [Active]
├── doc/                                # Internal developer documentation [Active]
│   ├── plans/                          # 30+ timestamped implementation plans (2026-02 through 2026-05) [Active]
│   ├── plugins/                        # Plugin authoring guide, spec, local dev guide [Active]
│   └── spec/                           # Smaller spec docs (agent-runs, invite-flow, UI) [Active]
├── docker/                             # Docker configurations [Active]
│   ├── openclaw-smoke/                 # Webhook recorder for OpenClaw smoke tests [Stable]
│   ├── quadlet/                        # Podman/systemd unit files [Stable]
│   └── untrusted-review/              # Capability-dropped PR review container [Stable]
├── docs/                               # Public-facing Mintlify documentation [Active]
│   ├── adapters/                       # Adapter documentation (creating, configuring) [Active]
│   ├── api/                            # REST API reference docs [Active]
│   ├── cli/                            # CLI reference docs [Active]
│   ├── companies/                      # Agent Companies spec (agentcompanies/v1) [Active]
│   ├── deploy/                         # Deployment guides (Docker, AWS ECS, Tailscale) [Active]
│   ├── guides/                         # Board operator + agent developer guides [Active]
│   └── start/                          # Quickstart, core concepts, architecture [Active]
├── evals/                              # Promptfoo heartbeat behavior evals [Active]
│   └── promptfoo/                      # Config + core/governance test suites [Active]
├── packages/                           # Shared workspace packages [Active]
│   ├── adapter-utils/                  # Shared adapter utilities (process mgmt, SSH, sandbox bridge) [Active]
│   ├── adapters/                       # 9 agent adapter packages [Active]
│   │   ├── acpx-local/                 # ACPX in-process adapter (claude + codex) [Active]
│   │   ├── claude-local/               # Claude Code CLI adapter [Active]
│   │   ├── codex-local/                # OpenAI Codex CLI adapter [Active]
│   │   ├── cursor-cloud/               # Cursor Cloud SDK adapter [Active]
│   │   ├── cursor-local/               # Cursor CLI adapter [Active]
│   │   ├── gemini-local/               # Google Gemini CLI adapter [Active]
│   │   ├── openclaw-gateway/           # OpenClaw WebSocket gateway adapter [Active]
│   │   ├── opencode-local/             # OpenCode CLI adapter [Active]
│   │   └── pi-local/                   # Pi coding agent adapter [Active]
│   ├── db/                             # Drizzle ORM schema + 85 migrations [Active]
│   │   ├── drizzle/                    # Generated migration SQL files [Generated]
│   │   └── src/schema/                 # Table definitions [Active]
│   ├── mcp-server/                     # MCP server (40 Paperclip API tools) [Active]
│   ├── plugins/                        # Plugin ecosystem [Active]
│   │   ├── create-paperclip-plugin/    # Plugin scaffolding CLI [Active]
│   │   ├── examples/                   # Example plugins (hello-world, kitchen-sink, etc.) [Stable]
│   │   ├── paperclip-plugin-fake-sandbox/ # Test sandbox provider [Stable]
│   │   ├── plugin-llm-wiki/            # LLM Wiki knowledge management plugin [Active]
│   │   ├── sandbox-providers/          # 4 sandbox provider plugins [Active]
│   │   │   ├── cloudflare/             # Cloudflare Workers sandbox [Active]
│   │   │   ├── daytona/                # Daytona sandbox [Active]
│   │   │   ├── e2b/                    # E2B cloud sandbox [Active]
│   │   │   └── exe-dev/                # exe.dev VM sandbox [Active]
│   │   └── sdk/                        # Plugin SDK (@paperclipai/plugin-sdk) [Active]
│   └── shared/                         # Shared types, constants, Zod validators [Active]
├── patches/                            # pnpm patch overrides [Stable]
├── releases/                           # Release changelogs (vYYYY.MDD.P.md) [Active]
├── report/                             # One-off agent implementation reports [Stale]
├── scripts/                            # Build, release, and dev tooling (~60 files) [Active]
├── server/                             # Express REST API + orchestration engine [Active]
│   └── src/                            # Routes, services, middleware, adapters, plugins [Active]
├── skills/                             # Agent-facing runtime skills [Active]
│   ├── paperclip/                      # Core heartbeat protocol skill [Active]
│   ├── paperclip-create-agent/         # Agent hiring skill [Active]
│   ├── paperclip-create-plugin/        # Plugin authoring skill [Active]
│   ├── paperclip-dev/                  # Dev & ops skill [Active]
│   └── ...                             # 4 more skills [Active]
├── tests/                              # E2E and release smoke tests [Active]
│   ├── e2e/                            # Playwright E2E (onboarding, signoff, multi-user) [Active]
│   └── release-smoke/                  # Docker release smoke tests [Active]
└── ui/                                 # React + Vite board UI [Active]
    └── src/                            # Pages, components, hooks, adapters, plugins, API [Active]
```

## Purpose Index

| Directory | Purpose | Status |
|---|---|---|
| `.agents/skills/` | Maintainer agent skills (release, PR review, docs) | Active |
| `.claude/skills/` | Claude Code design guide skill | Stable |
| `.github/workflows/` | 6 CI/CD pipelines | Active |
| `.project-state/` | Generated status artifacts | Generated |
| `cli/` | CLI package (Commander.js, 30+ commands) | Active |
| `doc/` | Internal developer docs (SPEC, PRODUCT, DEVELOPING) | Active |
| `doc/plans/` | 30+ timestamped implementation plans | Active |
| `doc/plugins/` | Plugin authoring guide and spec | Active |
| `docker/` | Docker configs (compose, quadlet, smoke) | Active |
| `docs/` | Public Mintlify documentation | Active |
| `evals/` | Promptfoo heartbeat behavior evals | Active |
| `packages/adapter-utils/` | Shared adapter utilities | Active |
| `packages/adapters/` | 9 agent adapter implementations | Active |
| `packages/db/` | Drizzle schema + 85 migrations | Active |
| `packages/mcp-server/` | MCP server (40 tools) | Active |
| `packages/plugins/` | Plugin ecosystem (SDK, examples, providers) | Active |
| `packages/shared/` | Shared types, constants, Zod validators | Active |
| `patches/` | pnpm patch overrides (1 file) | Stable |
| `releases/` | Release changelogs | Active |
| `report/` | One-off agent reports | Stale |
| `scripts/` | Build, release, dev tooling (~60 files) | Active |
| `server/` | Express API + orchestration engine | Active |
| `skills/` | Agent runtime skills (heartbeat protocol, etc.) | Active |
| `tests/` | E2E + release smoke tests | Active |
| `ui/` | React board UI (75+ pages, 160 components) | Active |

## Overlap Analysis

### Documentation directories — when to use which

| Directory | What goes here | Don't put here |
|---|---|---|
| `doc/` | Internal developer docs (specs, plans, runbooks) | Public-facing docs |
| `docs/` | Public Mintlify docs (quickstart, API ref, guides) | Internal implementation plans |
| `AGENTS.md` | Contributor + AI agent guidance, engineering rules | Detailed specs (use doc/) |
| `README.md` | Product overview, setup, quick start | Implementation details |

### Skills directories — when to use which

| Directory | What goes here | Loaded by |
|---|---|---|
| `skills/` | Agent runtime skills (injected at heartbeat time) | Adapter skill injection |
| `.agents/skills/` | Maintainer/operator skills (release, PR review) | Manual invocation |
| `.claude/skills/` | Claude Code-specific skills (design guide) | Claude Code session |

### Test directories — when to use which

| Directory | What goes here |
|---|---|
| `tests/e2e/` | Playwright browser E2E tests |
| `tests/release-smoke/` | Docker container release smoke tests |
| `evals/` | Promptfoo LLM behavior evals |
| `*.test.ts` (co-located) | Vitest unit/integration tests |

## Recommendations

1. **[CLEANUP] `report/`** — Contains a single 2026-03-13 implementation report. One-off artifact — archive or move to `doc/plans/`.
2. **[CLEANUP] `docs/plans/` + `docs/specs/`** — Internal planning content that leaked into the public Mintlify docs site. Move to `doc/` or delete.
3. **[CLEANUP] `doc/experimental/`** — Single orphaned file (`issue-worktree-support.md`). Feature has shipped — archive.
4. **[CLEANUP] `doc/README-draft.md`** — Unfinished README draft with outline bullets only. Complete or delete.
5. **[CLEANUP] `doc/pr/`** — Transient PR-scoped working docs accumulate post-merge. Add cleanup convention.
6. **[DOCUMENT] `skills/`** — No README explaining the three-tier skill system (`skills/` = dev, `.agents/skills/` = runtime, `.claude/skills/` = symlinks).
7. **[DOCUMENT] `scripts/`** — ~60 files with no README. Would benefit from a brief index of script purposes.
8. **[DOCUMENT] `evals/`** — No README explaining the eval framework or how to run evals.
