import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";

import { AppleDbReader } from "./apple-db/reader.js";
import {
  classifyFailedTools,
  summarizeFailureCounts,
} from "./classify.js";
import { DATA_KEYS, PAGE_WINDOW_MS, WIDGET_WINDOW_MS } from "./constants.js";

/**
 * Worker for the Claude Proxy Insights plugin.
 *
 * The worker is intentionally thin: it owns a single `AppleDbReader` and
 * exposes a handful of read-only `ctx.data.register` handlers. All session →
 * agent attribution happens client-side in the UI by combining the data
 * returned here with Paperclip's existing `/api/companies/:id/heartbeat-runs`
 * endpoint (called same-origin from the plugin UI).
 *
 * Capabilities required:
 *   - `ui.dashboardWidget.register`
 *   - `ui.page.register`
 *
 * The worker does NOT mutate Paperclip state and does NOT make HTTP calls.
 */

const WORKER_NAME = "claude-proxy-insights";

/** Parse an integer query param with a fallback; ignore non-finite results. */
function parseIntParam(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function getWindowMsFromParams(params: unknown, fallback: number): number {
  if (params && typeof params === "object" && "windowMs" in params) {
    return parseIntParam(
      (params as { windowMs?: unknown }).windowMs,
      fallback,
      60_000, // never less than a minute
      24 * 60 * 60 * 1000, // never more than a day
    );
  }
  return fallback;
}

function getLimitFromParams(params: unknown, fallback: number): number {
  if (params && typeof params === "object" && "limit" in params) {
    return parseIntParam(
      (params as { limit?: unknown }).limit,
      fallback,
      1,
      500,
    );
  }
  return fallback;
}

const plugin = definePlugin({
  async setup(ctx) {
    const reader = new AppleDbReader();

    /**
     * Summary endpoint — single payload optimized for the dashboard widget.
     * Returns the smallest set of numbers needed to render an at-a-glance card.
     */
    ctx.data.register(DATA_KEYS.SUMMARY, async (params) => {
      const windowMs = getWindowMsFromParams(params, WIDGET_WINDOW_MS);
      const since = Date.now() - windowMs;

      const [quota, failures, blocked, mcp, activeProxyPorts, latestSuccess] =
        await Promise.all([
          reader.readQuota(),
          reader.readFailedTools(since, 500),
          reader.readBlockedRequests(since, 500),
          reader.readMcpTools(),
          reader.readActiveProxyPorts(),
          // Look at a wider window than the widget window — a session may have
          // had a timeout 4h ago and successes 2h ago; the dashboard window is
          // 1h, but we still want to mark the timeout as bookkeeping noise.
          reader.readSessionLatestSuccess(Date.now() - 24 * 60 * 60 * 1000),
        ]);
      // Capture status AFTER the reads — the reader opens its connection
      // lazily on first read, so status() before the reads would lie.
      const status = reader.status();

      const activeProxySet = new Set(activeProxyPorts);
      const latestSuccessMap = new Map(
        latestSuccess.map((row) => [row.sessionId, row.latestSuccessAt] as const),
      );
      const classified = classifyFailedTools(failures, activeProxySet, latestSuccessMap);
      const counts = summarizeFailureCounts(classified);

      const rateLimited = quota.filter(
        (row) =>
          row.rateLimitedUntil !== null && row.rateLimitedUntil > Date.now(),
      );
      const last429 = quota.reduce<number | null>((acc, row) => {
        if (row.last429Timestamp === null) return acc;
        if (acc === null) return row.last429Timestamp;
        return Math.max(acc, row.last429Timestamp);
      }, null);

      // failuresByTool only counts REAL failures — orphan hook-bookkeeping
      // timeouts would otherwise drown out actionable signals (Bash, Glob, …).
      const failuresByTool: Record<string, number> = {};
      for (const row of classified) {
        if (row.classification !== "real") continue;
        failuresByTool[row.toolName] = (failuresByTool[row.toolName] ?? 0) + 1;
      }

      const blockedByHost: Record<string, number> = {};
      for (const row of blocked) {
        const key = row.hostname ?? "(unknown)";
        blockedByHost[key] = (blockedByHost[key] ?? 0) + 1;
      }

      return {
        source: status,
        windowMs,
        totals: {
          failedToolCalls: counts.real,
          orphanToolCalls: counts.orphan,
          totalFailureRows: counts.total,
          blockedRequests: blocked.length,
          mcpTools: mcp.length,
          mcpServers: new Set(mcp.map((t) => t.serverName)).size,
        },
        rateLimit: {
          activeModels: rateLimited.map((row) => ({
            model: row.model,
            until: row.rateLimitedUntil,
          })),
          last429AtEpochMs: last429,
        },
        failuresByTool,
        blockedByHost,
      };
    });

    /** Quota / rate-limit status — used by the quota tab. */
    ctx.data.register(DATA_KEYS.QUOTA, async () => {
      const quota = await reader.readQuota();
      return { source: reader.status(), rows: quota };
    });

    /** Failed tool calls feed — used by the tool-failures tab. */
    ctx.data.register(DATA_KEYS.FAILED_TOOLS, async (params) => {
      const windowMs = getWindowMsFromParams(params, PAGE_WINDOW_MS);
      const limit = getLimitFromParams(params, 200);
      const since = Date.now() - windowMs;
      const [rows, activity, activeProxyPorts, latestSuccess] = await Promise.all([
        reader.readFailedTools(since, limit),
        reader.readActivityBySession(since, 500),
        reader.readActiveProxyPorts(),
        reader.readSessionLatestSuccess(Date.now() - 24 * 60 * 60 * 1000),
      ]);
      const latestSuccessMap = new Map(
        latestSuccess.map((row) => [row.sessionId, row.latestSuccessAt] as const),
      );
      const classified = classifyFailedTools(
        rows,
        new Set(activeProxyPorts),
        latestSuccessMap,
      );
      const counts = summarizeFailureCounts(classified);
      return {
        source: reader.status(),
        windowMs,
        rows: classified,
        counts,
        sessionActivity: activity,
      };
    });

    /** Blocked network/inference requests feed. */
    ctx.data.register(DATA_KEYS.BLOCKED_NETWORK, async (params) => {
      const windowMs = getWindowMsFromParams(params, PAGE_WINDOW_MS);
      const limit = getLimitFromParams(params, 200);
      const since = Date.now() - windowMs;
      const rows = await reader.readBlockedRequests(since, limit);
      return { source: reader.status(), windowMs, rows };
    });

    /** MCP server tools registry + health (last_seen). */
    ctx.data.register(DATA_KEYS.MCP_HEALTH, async () => {
      const rows = await reader.readMcpTools();

      // Group by server for easy rendering.
      const servers = new Map<
        string,
        { server: string; tools: typeof rows; lastSeen: number; enabledCount: number }
      >();
      for (const row of rows) {
        const existing = servers.get(row.serverName);
        if (existing) {
          existing.tools.push(row);
          existing.lastSeen = Math.max(existing.lastSeen, row.lastSeen);
          existing.enabledCount += row.enabled ? 1 : 0;
        } else {
          servers.set(row.serverName, {
            server: row.serverName,
            tools: [row],
            lastSeen: row.lastSeen,
            enabledCount: row.enabled ? 1 : 0,
          });
        }
      }

      return {
        source: reader.status(),
        servers: Array.from(servers.values()).sort((a, b) =>
          a.server.localeCompare(b.server),
        ),
        totalTools: rows.length,
      };
    });

    /** Raw reader status — handy for the empty/error UI states. */
    ctx.data.register(DATA_KEYS.SOURCE_HEALTH, async () => reader.status());

    ctx.logger.info(`${WORKER_NAME} ready`);
  },

  async onHealth() {
    return {
      status: "ok",
      message: "Claude Proxy Insights — reading Apple Claude Code SQLite snapshots",
    };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
