# Codebase Health Audit
> Generated: 2026-05-23T18:00:00Z | Commit: e7ffda1a | Branch: master
> Stack: Express 5 API · Drizzle ORM (PostgreSQL) · no queue · Vite SPA (React 19)

## Summary

| Category | Total | Used | Orphaned | Notes |
|----------|-------|------|----------|-------|
| API Endpoints | 310 | 309 | 1 | POST /instance/database-backups is test-only |
| Frontend Routes | 47 | 46 | 1 | design-guide redirect has zero nav refs |
| Components | 153 | 147 | 6 | confirmed zero-import components |
| DB Tables | 86 | 86 | 0 | all queried in server/src |
| Package Exports | 5 pkgs | 5 | 0 | all consumed across workspace |
| Workflows | N/A | N/A | N/A | no queue adapter (skipped) |
| Type Exports | 683+ | ~670 | ~13 internal-only | shared-pkg types used within package |
| Env Vars | ~100 | ~86 | 11 undocumented | sparse .env.example; see below |

---

## Critical Findings

1. **`VITE_FEEDBACK_TERMS_URL`** — referenced in `IssueDetail.tsx:171` and `InstanceGeneralSettings.tsx:21` but absent from `.env.example` and `docs/deploy/environment-variables.md`. Has a hardcoded fallback to `https://paperclip.ing/tos` but self-hosters can't discover or override it.

2. **`PAPERCLIP_CLOUD_TENANT_SERVER_TOKEN`** — referenced in `server/src/middleware/auth.ts:203` (cloud-tenant auth gate), not documented in any env file or docs. Cloud SaaS-only feature invisible to self-hosters.

3. **`PAPERCLIP_TELEMETRY_BACKEND_TOKEN` / `PAPERCLIP_TELEMETRY_BACKEND_URL`** — referenced in server telemetry paths, not documented. Skafld-internal infra vars that should be explicitly marked as internal or added to env-variables.md.

4. **Orphaned component `AgentProperties`** — `ui/src/components/AgentProperties.tsx` has zero imports in all of `ui/src`. Appears superseded by inline agent config panels.

5. **Orphaned component `PackageFileTree`** — `ui/src/components/PackageFileTree.tsx` has zero imports. Likely a prototype for the file-tree feature now handled by `FileTree.tsx`.

6. **Orphaned component `AccountingModelCard`** — `ui/src/components/AccountingModelCard.tsx` has zero imports. Vestigial finance UI widget.

7. **Orphaned components `ExecutionParticipantPicker`, `SecretBindingPicker`, `CompanySwitcher`** — all three at `ui/src/components/` have zero imports anywhere in `ui/src`. Incomplete or replaced pickers.

8. **`POST /instance/database-backups`** — test-only (`instance-database-backups-routes.test.ts`). No UI client code, no CLI client. Backup is triggered server-side by schedule, not via this API. Endpoint exists but is dead from a client perspective.

9. **`RUN_LOG_BASE_PATH` / `WORKSPACE_OPERATION_LOG_BASE_PATH`** — runtime path overrides in `run-log-store.ts` and `workspace-operation-log-store.ts` that are undocumented. Low risk (have defaults) but invisible to operators who want to customize log storage.

10. **`design-guide` frontend route** — `App.tsx:136` registers `<Route path="design-guide" element={<Navigate to="/dashboard" replace />} />` with zero outbound navigation links. Dead legacy redirect, safe to remove.

---

## API Endpoints

> 310 total endpoint definitions across 36 route files in `server/src/routes/`. All wired via `registerRoutes()` in `server/src/app.ts`.

| Method | Path | Status | Referenced By |
|--------|------|--------|--------------|
| GET | `/` | used | health/redirect |
| GET | `/health` | used | Railway probe |
| GET | `/.well-known/oauth-authorization-server` | used | OAuth clients (MCP) |
| GET | `/.well-known/oauth-protected-resource` | used | OAuth clients (MCP) |
| GET | `/authorize` | used | OAuth PKCE flow |
| POST | `/authorize` | used | OAuth PKCE form |
| POST | `/oauth/token` | used | OAuth token exchange |
| POST | `/oauth/register` | used | Dynamic client registration |
| GET | `/board-claim/:token` | used | CLI board-claim |
| POST | `/board-claim/:token/claim` | used | CLI board-claim |
| GET | `/admin/users` | used | `ui/src/api/access.ts:400` |
| GET | `/admin/users/:userId/company-access` | used | `ui/src/api/access.ts:409` |
| GET | `/agents/:id` | used | AgentDetail page |
| GET | `/agents/:id/config-revisions` | used | AgentDetail config tab |
| GET | `/agents/:id/configuration` | used | AgentDetail page |
| GET | `/agents/:id/keys` | used | AgentDetail keys tab |
| GET | `/agents/:id/runtime-state` | used | AgentDetail |
| GET | `/agents/:id/skills` | used | AgentDetail skills tab |
| GET | `/agents/:id/task-sessions` | used | AgentDetail |
| POST | `/agents/:id/heartbeat/invoke` | used | dev tooling |
| POST | `/agents/:id/wakeup` | used | issue wakeup flow |
| POST | `/agents/:id/pause` / `/resume` / `/terminate` | used | AgentDetail |
| POST | `/agents/:id/approve` | used | approval flow |
| GET | `/agents/me` | used | agent self-identification |
| GET | `/agents/me/inbox-lite` | used | MCP inbox tool |
| GET | `/agents/me/inbox/mine` | used | agent inbox |
| GET | `/companies/:companyId` | used | CompanyContext |
| GET | `/companies/:companyId/agents` | used | Agents page |
| GET | `/companies/:companyId/dashboard` | used | Dashboard page |
| POST | `/companies/:companyId/issues` | used | CreateIssue |
| GET | `/companies/:companyId/activity` | used | Activity page |
| GET | `/companies/:companyId/costs/*` (11 endpoints) | used | Costs page |
| GET | `/companies/:companyId/environments` | used | CompanyEnvironments |
| GET | `/companies/:companyId/feedback-traces` | used | CLI `paperclipai feedback` |
| GET | `/issues/:id` | used | IssueDetail page |
| PATCH | `/issues/:id` | used | IssueDetail |
| DELETE | `/issues/:id` | used | IssueDetail |
| POST | `/issues/:id/comments` | used | IssueDetail comment box |
| POST | `/issues/:id/feedback-votes` | used | IssueDetail vote buttons |
| POST | `/issues/:id/checkout` / `/release` | used | agent checkout |
| GET | `/issues/:id/feedback-traces` | used | CLI & IssueDetail |
| POST | `/heartbeat-runs/:runId/watchdog-decisions` | used | `ui/src/api/heartbeats.ts:98` |
| POST | `/instance/database-backups` | **test-only** | `__tests__/instance-database-backups-routes.test.ts` only |
| GET | `/llms/agent-configuration.txt` | used | LLM discovery (external agents) |
| GET | `/llms/agent-icons.txt` | used | LLM discovery (external) |
| GET | `/llms/agent-configuration/:type.txt` | used | LLM discovery (external) |
| GET | `/_plugins/:pluginId/ui/*filePath` | used | plugin UI static serving |
| POST | `/plugins/tools/execute` | used | plugin tool execution |
| POST | `/plugins/:pluginId/webhooks/:endpointKey` | used | plugin webhook delivery |
| GET | `/projects/:id` | used | ProjectDetail |
| POST | `/projects/:id/workspaces` | used | ProjectDetail |
| GET | `/routines/:id` | used | RoutineDetail |
| POST | `/routines/:id/run` | used | RoutineDetail run button |
| GET | `/approvals/:id` | used | ApprovalDetail |
| POST | `/approvals/:id/approve` / `/reject` | used | ApprovalDetail |
| GET | `/goals/:id` | used | GoalDetail |
| GET | `/cli-auth/me` | used | CLI auth |
| POST | `/cli-auth/revoke-current` | used | CLI logout |
| PUT | `/sidebar-preferences/me` | used | Sidebar persistence |
| GET | `/execution-workspaces/:id` | used | ExecutionWorkspaceDetail |
| … (remaining ~250 endpoints) | used | — |

---

## Frontend Routes

> 47 Route entries in `ui/src/App.tsx`. 12 are `Navigate` redirects for legacy URL compat. 1 confirmed orphaned.

| Route | Component | Status | Linked From |
|-------|-----------|--------|-------------|
| `dashboard` | Dashboard | used | Sidebar nav |
| `dashboard/live` | DashboardLive | used | Dashboard header |
| `onboarding` | OnboardingRoutePage | used | CompanySwitcher, dialog actions |
| `companies` | Companies | used | CompanyContext, multi-company picker |
| `company/settings` | CompanySettings | used | Sidebar settings link |
| `company/settings/environments` | CompanyEnvironments | used | Settings nav |
| `company/settings/access` | CompanyAccess | used | Settings nav |
| `company/settings/invites` | CompanyInvites | used | Settings nav |
| `company/settings/secrets` | Secrets | used | Settings nav |
| `company/export/*` | CompanyExport | used | Settings nav (5 refs) |
| `company/import` | CompanyImport | used | Settings nav (2 refs) |
| `skills/*` | CompanySkills | used | Sidebar (13 refs) |
| `settings` | LegacySettingsRedirect | used | legacy link compat |
| `settings/*` | LegacySettingsRedirect | used | legacy link compat |
| `plugins/:pluginId` | PluginPage | used | Sidebar plugins |
| `org` | OrgChart | used | Sidebar org link (4 refs) |
| `agents` | Navigate → /agents/all | used | redirect |
| `agents/all` | Agents | used | Sidebar |
| `agents/active` / `paused` / `error` | Navigate → /agents/all | used | legacy redirects |
| `agents/new` | NewAgent | used | Agents page button |
| `agents/:agentId` | AgentDetail | used | agent links throughout |
| `agents/:agentId/:tab` | AgentDetail | used | tab navigation |
| `agents/:agentId/runs/:runId` | AgentDetail | used | heartbeat run links |
| `projects` | Projects | used | Sidebar |
| `projects/:projectId` | ProjectDetail | used | project links |
| `projects/:projectId/overview` / `issues` / `workspaces` / `configuration` / `budget` | ProjectDetail | used | ProjectDetail tab nav |
| `workspaces` | Workspaces | used | Sidebar (14 refs) |
| `issues` | Issues | used | Sidebar |
| `search` | Search | used | CommandPalette, keyboard shortcut (23 refs) |
| `issues/all` / `active` / `backlog` / `done` / `recent` | Navigate → /issues | used | legacy redirects |
| `issues/:issueId` | IssueDetail | used | issue links throughout |
| `routines` | Routines | used | Sidebar |
| `routines/:routineId` | RoutineDetail | used | Routines page |
| `execution-workspaces/:workspaceId` + 4 tab variants | ExecutionWorkspaceDetail | used | workspace links |
| `goals` | Goals | used | Sidebar |
| `goals/:goalId` | GoalDetail | used | Goals page |
| `approvals` / `approvals/pending` / `approvals/all` | Approvals | used | Sidebar |
| `approvals/:approvalId` | ApprovalDetail | used | approval links |
| `costs` | Costs | used | Sidebar |
| `activity` | Activity | used | Sidebar |
| `inbox` / `inbox/mine` / `inbox/recent` / `inbox/unread` / `inbox/blocked` / `inbox/all` | Inbox | used | Sidebar |
| `inbox/requests` | JoinRequestQueue | used | Inbox nav |
| `u/:userSlug` | UserProfile | used | agent/user profile links |
| **`design-guide`** | Navigate → /dashboard | **orphaned** | zero navigation refs in codebase |
| `instance/settings/adapters` | AdapterManager | used | settings redirect |
| `tests/perf/long-thread` | IssueChatLongThreadPerf | used (DEV only) | dev mode only |
| `:pluginRoutePath/*` | PluginPage | used | plugin-registered routes |

---

## Components

> 153 `.tsx` files in `ui/src/components/` (excluding test files). 6 confirmed orphaned (zero imports in entire `ui/src/`).

| Component | File | Status | Imported By |
|-----------|------|--------|-------------|
| **AgentProperties** | `components/AgentProperties.tsx` | **orphaned** | zero imports |
| **PackageFileTree** | `components/PackageFileTree.tsx` | **orphaned** | zero imports |
| **AccountingModelCard** | `components/AccountingModelCard.tsx` | **orphaned** | zero imports |
| **ExecutionParticipantPicker** | `components/ExecutionParticipantPicker.tsx` | **orphaned** | zero imports |
| **SecretBindingPicker** | `components/SecretBindingPicker.tsx` | **orphaned** | zero imports |
| **CompanySwitcher** | `components/CompanySwitcher.tsx` | **orphaned** | zero imports |
| CommentThread | `components/CommentThread.tsx` | used | 9 refs |
| Layout | `components/Layout.tsx` | used | App.tsx |
| Sidebar | `components/Sidebar.tsx` | used | Layout.tsx |
| SidebarAgents | `components/SidebarAgents.tsx` | used | Sidebar.tsx |
| SidebarProjects | `components/SidebarProjects.tsx` | used | Sidebar.tsx |
| CommandPalette | `components/CommandPalette.tsx` | used | Layout.tsx |
| PropertiesPanel | `components/PropertiesPanel.tsx` | used | multiple pages |
| MarkdownEditor | `components/MarkdownEditor.tsx` | used | multiple pages |
| ScheduleEditor | `components/ScheduleEditor.tsx` | used | RoutineDetail |
| … (remaining 132) | — | used | — |

**Note on `ui/src/components/ui/`** — shadcn/ui primitives (`tabs.tsx`, `card.tsx`, `dialog.tsx`, etc.) are imported via `@/components/ui/<name>` path aliases. All are actively used.

---

## DB Tables

> 86 Drizzle `pgTable` definitions across `packages/db/src/schema/`. All referenced in `server/src/` application code. Zero orphaned.

| Table Variable | SQL Name | Status | Approx. Refs |
|----------------|----------|--------|-------------|
| issues | issues | used | 2,548+ |
| agents | agents | used | 1,082+ |
| issueComments | issue_comments | used | 400+ |
| heartbeatRuns | heartbeat_runs | used | 300+ |
| companies | companies | used | 761+ |
| pluginManagedResources | plugin_managed_resources | used | 115 |
| workspaceRuntimeServices | workspace_runtime_services | used | 65 |
| issueTreeHolds | issue_tree_holds | used | 65 |
| routineTriggers | routine_triggers | used | 76 |
| agentTaskSessions | agent_task_sessions | used | 41 |
| issueWorkProducts | issue_work_products | used | 40 |
| budgetIncidents | budget_incidents | used | 40 |
| workspaceOperations | workspace_operations | used | 46 |
| feedbackExports | feedback_exports | used | 46 |
| companySecretVersions | company_secret_versions | used | 41 |
| agentRuntimeState | agent_runtime_state | used | 36 |
| companySecretProviderConfigs | company_secret_provider_configs | used | 29 |
| pluginState | plugin_state | used | 27 |
| financeEvents | finance_events | used | 27 |
| heartbeatRunWatchdogDecisions | heartbeat_run_watchdog_decisions | used | 10 |
| secretAccessEvents | secret_access_events | used | 7 |
| … (remaining 65 tables) | — | used | — |

---

## Package Exports

> 5 key workspace packages. All exported symbols are consumed by at least one other package.

| Package | Entry | Total Exports | Orphaned |
|---------|-------|---------------|----------|
| `@paperclipai/shared` | `packages/shared/src/index.ts` | 200+ constants, 683+ types | 0 |
| `@paperclipai/db` | `packages/db/src/index.ts` | 86 table vars + 12 client fns + backup lib | 0 |
| `@paperclipai/adapter-utils` | `packages/adapter-utils/src/index.ts` | 30+ adapter types/interfaces | 0 |
| `@paperclipai/mcp-server` | `packages/mcp-server/src/index.ts` | `PaperclipApiClient`, `createPaperclipMcpServer`, `createToolDefinitions`, `PaperclipMcpConfig` | 0 |
| `@paperclipai/plugin-sdk` | `packages/plugins/sdk/src/index.ts` | Plugin SDK types and runtime helpers | 0 |

---

## Type Definitions

> 683+ `export type` and `export interface` declarations in `packages/shared/src/` alone. The package is published to npm so all exports are potentially consumer-facing.

| Scope | Type Count | Interface Count | Status |
|-------|-----------|-----------------|--------|
| `packages/shared/src/` (non-index) | 356 | 327 | used or internal-only |
| `packages/adapter-utils/src/` | 30+ | — | used by adapter packages |
| `server/src/` (internal) | 100+ | — | local-only, not exported |

**Internal-only exported types** (in shared/index.ts but not referenced by server/ui/cli):
- `AddApprovalComment`, `AddIssueComment` — request body types only used within shared
- `AgentMineInboxQuery`, `AgentInstructionsBundleMode` — agent-context types
- `BoardCliAuthAccessLevel`, `BudgetIncidentResolutionAction`, `BudgetIncidentStatus` — fine-grained enum types
- `CompanyPortabilityAgentSelection`, `CompanyPortabilityImportTarget` — portability flow types
- `CompanySkillFileUpdate`, `ClaimJoinRequestApiKey` — narrow request types

These are kept in the public API for npm consumers; they're not dead code.

---

## Environment Variables

> ~100 env vars referenced in `server/src/`, `ui/src/`, `cli/src/`. `.env.example` documents only the 5 minimum required for local startup. Full reference at `docs/deploy/environment-variables.md`.

### Undocumented (referenced in code, absent from all env docs)

| Variable | Referenced In | Risk | Notes |
|----------|---------------|------|-------|
| `VITE_FEEDBACK_TERMS_URL` | `IssueDetail.tsx:171`, `InstanceGeneralSettings.tsx:21` | low | Has fallback to hardcoded TOS URL |
| `PAPERCLIP_CLOUD_TENANT_SERVER_TOKEN` | `middleware/auth.ts:203` | medium | Cloud-SaaS auth gate, undiscoverable to self-hosters |
| `PAPERCLIP_API_BRIDGE_MODE` | server source | low | Internal bridge mode flag |
| `PAPERCLIP_LISTEN_HOST` / `PAPERCLIP_LISTEN_PORT` | server bind config | low | Legacy aliases for bind config |
| `PAPERCLIP_TAILNET_BIND_HOST` | Tailscale integration | low | Optional Tailscale feature |
| `PAPERCLIP_TELEMETRY_BACKEND_TOKEN` / `PAPERCLIP_TELEMETRY_BACKEND_URL` | server telemetry | low | Skafld-internal infra |
| `PAPERCLIP_FEEDBACK_EXPORT_BACKEND_TOKEN` / `PAPERCLIP_FEEDBACK_EXPORT_BACKEND_URL` | feedback export backend | low | Skafld-internal infra |
| `RUN_LOG_BASE_PATH` | `services/run-log-store.ts:154` | low | Has default, undiscoverable |
| `WORKSPACE_OPERATION_LOG_BASE_PATH` | `services/workspace-operation-log-store.ts:152` | low | Has default, undiscoverable |
| `RUNTIME_CUSTOM_ENV` | workspace adapter injection | low | Internal runtime injection |
| `AGENT_KEY` | agent bootstrap | medium | Agent auth key, not documented |

### Defined in `.env.example` (5 vars)

| Variable | Status |
|----------|--------|
| `DATABASE_URL` | used |
| `BETTER_AUTH_SECRET` | used |
| `HEARTBEAT_SCHEDULER_ENABLED` | used |
| `PORT` | used |
| `SERVE_UI` | used |

### Unused (defined in env files, not in code)

None — all 5 `.env.example` vars are referenced in application code.
