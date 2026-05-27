# @paperclipai/plugin-claude-proxy-insights

Read-only insights into the [Apple Claude Code](http://localhost:4232/) proxy database, surfaced inside Paperclip.

> **Status:** v0.1.0 (MVP). Read-only. Works with Apple Claude Code alpha
> `v1.4.0-alpha.28.*`. Targets the `claude_local` adapter.

## What it shows

| Surface | Tab | Signal |
|---------|-----|--------|
| Dashboard widget | — | Last-hour summary: failed tools, blocked requests, MCP tool counts, active rate-limits, last 429 |
| Plugin page | Quota | Per-model totals, inference/network blocked counts, `rate_limited_until`, `last_429_timestamp` |
| Plugin page | Tool failures | Recent `tool_calls` with `status='error'|'timeout'` — attributed to Paperclip agents via `session_id` join. Tool inputs are redacted by default; reveal-on-click shows the input hash only. |
| Plugin page | Blocked requests | Recent `requests` with `status='blocked'` — hostname, model, reason, category, attributed session |
| Plugin page | MCP health | All `mcp_server_tools` grouped by server, with last-seen heartbeat and enabled count |

## How it works

1. The worker locates the latest SQLite file at
   `~/.claude/apple/claude-proxy-shared-*-YYYY-MM-DD.db` and opens it
   **read-only** with the Node 22+ built-in `node:sqlite`.
2. It exposes five `ctx.data.register` endpoints (`summary`, `quota`,
   `failed-tools`, `blocked-network`, `mcp-health`).
3. The UI polls those endpoints every 30s.
4. The UI separately calls Paperclip's own
   `/api/companies/:companyId/heartbeat-runs` (same-origin, board session)
   to map Apple `session_id` ↔ Paperclip `agentId` for attribution.

The worker never mutates Apple's DB, never makes outbound HTTP calls, and never
mutates Paperclip state.

## Required capabilities

- `ui.dashboardWidget.register`
- `ui.page.register`
- `ui.sidebar.register`
- `agents.read` *(optional — reserved for future enrichment)*
- `plugin.state.read` / `plugin.state.write` *(reserved for future caching)*

## Building

```sh
pnpm --filter @paperclipai/plugin-claude-proxy-insights build
```

The build produces `dist/manifest.js`, `dist/worker.js`, and `dist/ui/`.

## Installing into a running Paperclip instance

From the Paperclip board UI: **Settings → Plugins → Install local plugin →**
point to this folder.

Or via API:

```sh
curl -X POST http://localhost:3100/api/plugins/install \
  -H 'Content-Type: application/json' \
  -d '{"source":"local","path":"<absolute-path-to-this-folder>"}'
```

## Architecture notes / non-goals

- **No write-side scope.** The plugin never modifies the allowlist, never
  retries failed calls, and never restarts agents. It's strictly observational.
- **Hook noise is filtered.** Session IDs of the form `shell-<ts>-<rand>` come
  from the `shell-command-checker-wrapper.sh` Claude-Code hook and are never
  tied to a Paperclip agent. They render as a muted "hook" pill so they don't
  pollute the attribution column.
- **Day rollover handled.** Apple writes one SQLite snapshot per day. The
  reader re-resolves the latest path on every poll, so when the file rolls
  over at midnight we automatically pick up the new one.

## Pending follow-ups (post-MVP)

- Plugin settings page for opt-out of attribution / privacy controls
- Optional "Global / unattributed" tab for direct Claude.app sessions
- Drill-down: click a failed tool call → open the corresponding heartbeat run
- Persist `last-seen` cursor in plugin state to keep summary deltas stable
- Multi-adapter support (codex-local, etc.) once those expose comparable DBs
