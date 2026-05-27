/**
 * Stable identifiers for the Claude Proxy Insights plugin.
 *
 * These are referenced from the manifest, worker data/action keys, and the UI
 * slot exports — keep them in a single module so renames stay coordinated.
 */

export const PLUGIN_ID = "paperclipai.claude-proxy-insights";
export const PLUGIN_VERSION = "0.1.0";
export const PLUGIN_DISPLAY_NAME = "Claude Proxy Insights";

export const DASHBOARD_WIDGET_SLOT_ID = "claude-proxy-insights-widget";
export const DASHBOARD_WIDGET_EXPORT_NAME = "ClaudeProxyInsightsWidget";

export const FULL_PAGE_SLOT_ID = "claude-proxy-insights-page";
export const FULL_PAGE_EXPORT_NAME = "ClaudeProxyInsightsPage";

/** Worker → UI data handler keys (`ctx.data.register(KEY, …)` ↔ `usePluginData(KEY)`). */
export const DATA_KEYS = {
  SUMMARY: "summary",
  QUOTA: "quota",
  FAILED_TOOLS: "failed-tools",
  BLOCKED_NETWORK: "blocked-network",
  MCP_HEALTH: "mcp-health",
  SOURCE_HEALTH: "source-health",
} as const;

/** Time window used by the dashboard widget summary (last hour). */
export const WIDGET_WINDOW_MS = 60 * 60 * 1000;

/** Default page tab window (last 4 hours) — keeps results small and fast. */
export const PAGE_WINDOW_MS = 4 * 60 * 60 * 1000;

/** Maximum number of rows returned for any feed query — caps memory/payload. */
export const MAX_ROWS = 200;
