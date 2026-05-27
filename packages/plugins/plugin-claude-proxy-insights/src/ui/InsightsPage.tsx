import { useEffect, useMemo, useState } from "react";
import {
  usePluginData,
  type PluginPageProps,
} from "@paperclipai/plugin-sdk/ui";

import { DATA_KEYS, PAGE_WINDOW_MS } from "../constants.js";
import {
  formatDelta,
  formatRelativeFromEpoch,
  shortModelLabel,
  toEpochMs,
  truncate,
} from "./format.js";
import { useSessionAttribution, type SessionAttribution } from "./useSessionAttribution.js";
import type {
  BlockedNetworkPayload,
  FailedToolsPayload,
  McpHealthPayload,
  QuotaPayload,
} from "./types.js";

type TabKey = "quota" | "failed-tools" | "blocked" | "mcp";

const POLL_INTERVAL_MS = 30_000;

const TABS: Array<{ id: TabKey; label: string }> = [
  { id: "quota", label: "Quota" },
  { id: "failed-tools", label: "Tool failures" },
  { id: "blocked", label: "Blocked requests" },
  { id: "mcp", label: "MCP health" },
];

const WINDOW_OPTIONS: Array<{ ms: number; label: string }> = [
  { ms: 60 * 60 * 1000, label: "1h" },
  { ms: 4 * 60 * 60 * 1000, label: "4h" },
  { ms: 24 * 60 * 60 * 1000, label: "24h" },
];

/**
 * Full-page tabbed view of Apple Claude Code proxy data. Polls every 30s and
 * enriches Apple session_ids with Paperclip agent attribution via same-origin
 * fetches against `/api/companies/:id/heartbeat-runs`.
 */
export function ClaudeProxyInsightsPage({ context }: PluginPageProps) {
  const [tab, setTab] = useState<TabKey>("quota");
  const [windowMs, setWindowMs] = useState<number>(PAGE_WINDOW_MS);

  return (
    <div style={pageStyle}>
      <header style={pageHeaderStyle}>
        <h1 style={pageTitleStyle}>Claude Proxy Insights</h1>
        <div style={subtleTextStyle}>
          Read-only view of the Apple Claude Code proxy SQLite store. Activity is
          attributed to the current company's agents where possible.
        </div>
      </header>

      <div style={tabBarStyle}>
        <div style={tabRowStyle}>
          {TABS.map((tabDef) => (
            <button
              key={tabDef.id}
              type="button"
              onClick={() => setTab(tabDef.id)}
              style={tabDef.id === tab ? activeTabStyle : tabStyle}
            >
              {tabDef.label}
            </button>
          ))}
        </div>
        {tab !== "quota" && tab !== "mcp" ? (
          <WindowPicker windowMs={windowMs} onChange={setWindowMs} />
        ) : null}
      </div>

      <div style={tabBodyStyle}>
        {tab === "quota" ? <QuotaTab /> : null}
        {tab === "failed-tools" ? (
          <FailedToolsTab companyId={context.companyId} windowMs={windowMs} />
        ) : null}
        {tab === "blocked" ? (
          <BlockedRequestsTab companyId={context.companyId} windowMs={windowMs} />
        ) : null}
        {tab === "mcp" ? <McpHealthTab /> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function WindowPicker({
  windowMs,
  onChange,
}: {
  windowMs: number;
  onChange: (ms: number) => void;
}) {
  return (
    <div style={windowPickerStyle}>
      <span style={subtleTextStyle}>Window:</span>
      {WINDOW_OPTIONS.map((opt) => (
        <button
          key={opt.ms}
          type="button"
          onClick={() => onChange(opt.ms)}
          style={opt.ms === windowMs ? activeChipStyle : chipStyle}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function usePollingPluginData<T>(
  key: string,
  params?: Record<string, unknown>,
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const { data, loading, error, refresh } = usePluginData<T>(key, params);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  return {
    data: data ?? null,
    loading,
    error: (error as Error | null) ?? null,
    refresh: refresh as () => Promise<void>,
  };
}

function SourceBanner({
  source,
}: {
  source: { path: string | null; date: string | null; available: boolean; lastError: string | null };
}) {
  if (source.available) {
    return (
      <div style={sourceBannerStyle}>
        Reading <code>{source.date ?? "unknown"}</code> snapshot
      </div>
    );
  }
  return (
    <div style={sourceBannerWarnStyle}>
      {source.lastError ?? "Apple Claude Code proxy DB unavailable."}
    </div>
  );
}

function SessionCell({
  sessionId,
  attribution,
}: {
  sessionId: string | null;
  attribution: SessionAttribution;
}) {
  if (!sessionId) {
    return <span style={subtleTextStyle}>—</span>;
  }
  // Hook scripts produce noise session ids like "shell-<ts>-<rand>". They're
  // never tied to a Paperclip agent.
  if (sessionId.startsWith("shell-")) {
    return <span style={subtleTextStyle}>hook</span>;
  }
  const match = attribution.get(sessionId);
  if (match) {
    return (
      <span title={`${sessionId}\nrun=${match.runId}`}>
        <strong>{match.agentName}</strong>
        <span style={subtleTextStyle}> ({match.status})</span>
      </span>
    );
  }
  return (
    <span style={subtleTextStyle} title={sessionId}>
      {truncate(sessionId, 8)}…
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tab: Quota
// ---------------------------------------------------------------------------

function QuotaTab() {
  const { data, loading, error } = usePollingPluginData<QuotaPayload>(
    DATA_KEYS.QUOTA,
  );

  if (loading && !data) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <Empty />;

  const sortedRows = [...data.rows].sort((a, b) => b.total - a.total);

  return (
    <div>
      <SourceBanner source={data.source} />
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Model</th>
            <th style={thNumStyle}>Total</th>
            <th style={thNumStyle}>Inf. blocked</th>
            <th style={thNumStyle}>Net. blocked</th>
            <th style={thStyle}>Rate-limited until</th>
            <th style={thStyle}>Last 429</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => {
            const isRateLimited =
              row.rateLimitedUntil !== null && row.rateLimitedUntil > Date.now();
            return (
              <tr key={row.model} style={isRateLimited ? trWarnStyle : undefined}>
                <td style={tdStyle}>
                  <code>{shortModelLabel(row.model)}</code>
                </td>
                <td style={tdNumStyle}>{row.total.toLocaleString()}</td>
                <td style={tdNumStyle}>{row.inferenceBlocked.toLocaleString()}</td>
                <td style={tdNumStyle}>{row.networkBlocked.toLocaleString()}</td>
                <td style={tdStyle}>
                  {isRateLimited
                    ? formatRelativeFromEpoch(row.rateLimitedUntil)
                    : "—"}
                </td>
                <td style={tdStyle}>
                  {row.last429Timestamp
                    ? formatRelativeFromEpoch(row.last429Timestamp)
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Failed tools
// ---------------------------------------------------------------------------

function FailedToolsTab({
  companyId,
  windowMs,
}: {
  companyId: string | null;
  windowMs: number;
}) {
  const { data, loading, error } = usePollingPluginData<FailedToolsPayload>(
    DATA_KEYS.FAILED_TOOLS,
    { windowMs },
  );
  const attribution = useSessionAttribution(companyId);
  const [revealedIds, setRevealedIds] = useState<Set<number>>(() => new Set());
  const [showOrphans, setShowOrphans] = useState(false);

  const visibleRows = useMemo(() => {
    if (!data) return [];
    return showOrphans
      ? data.rows
      : data.rows.filter((row) => row.classification === "real");
  }, [data, showOrphans]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <Empty />;

  const counts = data.counts ?? { real: 0, orphan: 0, total: data.rows.length };

  if (counts.total === 0) {
    return (
      <div>
        <SourceBanner source={data.source} />
        <div style={emptyStateStyle}>
          No tool failures in the last {formatDelta(windowMs)}. Healthy ✓
        </div>
      </div>
    );
  }

  function toggleReveal(id: number) {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <SourceBanner source={data.source} />
      <div style={failuresHeaderStyle}>
        <div>
          <strong>{counts.real}</strong> real failure{counts.real === 1 ? "" : "s"}{" "}
          {counts.orphan > 0 ? (
            <span style={subtleTextStyle}>
              · {counts.orphan} hook-bookkeeping artifact
              {counts.orphan === 1 ? "" : "s"} (orphan proxies / synthetic IDs)
            </span>
          ) : null}{" "}
          <span style={subtleTextStyle}>
            over the last {formatDelta(windowMs)}
          </span>
        </div>
        {counts.orphan > 0 ? (
          <label style={toggleLabelStyle}>
            <input
              type="checkbox"
              checked={showOrphans}
              onChange={(e) => setShowOrphans(e.target.checked)}
            />{" "}
            Show orphan bookkeeping
          </label>
        ) : null}
      </div>
      {visibleRows.length === 0 ? (
        <div style={emptyStateStyle}>
          No real tool failures in this window. The {counts.orphan} orphan row
          {counts.orphan === 1 ? " is" : "s are"} hidden — toggle to inspect them.
        </div>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>When</th>
              <th style={thStyle}>Tool</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Session / agent</th>
              <th style={thStyle}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const epoch = toEpochMs(row.timestamp);
              const revealed = revealedIds.has(row.id);
              const isOrphan = row.classification === "orphan";
              return (
                <tr key={row.id} style={isOrphan ? trOrphanStyle : undefined}>
                  <td style={tdStyle}>{formatRelativeFromEpoch(epoch)}</td>
                  <td style={tdStyle}>
                    <code>{row.toolName}</code>
                  </td>
                  <td style={tdStyle}>
                    <StatusPill status={row.status} />
                    {isOrphan ? (
                      <span
                        style={orphanBadgeStyle}
                        title={row.orphanReason ?? undefined}
                      >
                        orphan
                      </span>
                    ) : null}
                  </td>
                  <td style={tdStyle}>
                    <SessionCell
                      sessionId={row.sessionId}
                      attribution={attribution}
                    />
                  </td>
                  <td style={tdStyle}>
                    <div style={detailLineStyle}>
                      {isOrphan
                        ? row.orphanReason ?? "bookkeeping artifact"
                        : row.errorMessage
                        ? truncate(row.errorMessage, 80)
                        : "—"}
                      {row.executionTimeMs != null ? (
                        <span style={subtleTextStyle}>
                          {" "}· {row.executionTimeMs}ms
                        </span>
                      ) : null}
                    </div>
                    {row.inputHash ? (
                      <button
                        type="button"
                        onClick={() => toggleReveal(row.id)}
                        style={revealButtonStyle}
                      >
                        {revealed ? "Hide hash" : "Show hash"}
                      </button>
                    ) : null}
                    {revealed && row.inputHash ? (
                      <code style={hashStyle}>{row.inputHash}</code>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Blocked requests
// ---------------------------------------------------------------------------

function BlockedRequestsTab({
  companyId,
  windowMs,
}: {
  companyId: string | null;
  windowMs: number;
}) {
  const { data, loading, error } = usePollingPluginData<BlockedNetworkPayload>(
    DATA_KEYS.BLOCKED_NETWORK,
    { windowMs },
  );
  const attribution = useSessionAttribution(companyId);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <Empty />;

  if (data.rows.length === 0) {
    return (
      <div>
        <SourceBanner source={data.source} />
        <div style={emptyStateStyle}>
          No blocked requests in the last {formatDelta(windowMs)}. Allowlist looks
          healthy ✓
        </div>
      </div>
    );
  }

  return (
    <div>
      <SourceBanner source={data.source} />
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>When</th>
            <th style={thStyle}>Host</th>
            <th style={thStyle}>Model</th>
            <th style={thStyle}>Category</th>
            <th style={thStyle}>Reason</th>
            <th style={thStyle}>Session / agent</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => {
            const epoch = toEpochMs(row.timestamp);
            return (
              <tr key={row.id}>
                <td style={tdStyle}>{formatRelativeFromEpoch(epoch)}</td>
                <td style={tdStyle}>
                  <code>{row.hostname ?? "—"}</code>
                </td>
                <td style={tdStyle}>
                  <code>{shortModelLabel(row.model)}</code>
                </td>
                <td style={tdStyle}>{row.category ?? "—"}</td>
                <td style={tdStyle}>{row.reason ? truncate(row.reason, 60) : "—"}</td>
                <td style={tdStyle}>
                  <SessionCell sessionId={row.sessionId} attribution={attribution} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: MCP health
// ---------------------------------------------------------------------------

function McpHealthTab() {
  const { data, loading, error } = usePollingPluginData<McpHealthPayload>(
    DATA_KEYS.MCP_HEALTH,
  );

  if (loading && !data) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <Empty />;

  return (
    <div>
      <SourceBanner source={data.source} />
      <div style={subtleTextStyle}>
        {data.servers.length} servers · {data.totalTools} tools registered.
      </div>
      {data.servers.map((server) => (
        <details key={server.server} style={mcpServerStyle}>
          <summary style={mcpSummaryStyle}>
            <strong>{server.server}</strong>
            <span style={subtleTextStyle}>
              {" "}— {server.tools.length} tools, last seen{" "}
              {formatRelativeFromEpoch(server.lastSeen)}
            </span>
          </summary>
          <ul style={mcpToolListStyle}>
            {server.tools.map((tool) => (
              <li key={`${server.server}:${tool.toolName}`}>
                <code>{tool.toolName}</code>{" "}
                <span style={subtleTextStyle}>
                  ({tool.enabled ? "enabled" : "disabled"})
                </span>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bits & pieces
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: "error" | "timeout" }) {
  const style = status === "error" ? pillErrorStyle : pillTimeoutStyle;
  return <span style={style}>{status}</span>;
}

function Loading() {
  return <div style={subtleTextStyle}>Loading…</div>;
}

function Empty() {
  return <div style={subtleTextStyle}>No data.</div>;
}

function ErrorMessage({ error }: { error: Error }) {
  return <div style={errorTextStyle}>{error.message}</div>;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const pageStyle: React.CSSProperties = {
  padding: 24,
  maxWidth: 1200,
  margin: "0 auto",
};

const pageHeaderStyle: React.CSSProperties = {
  marginBottom: 16,
};

const pageTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 600,
};

const tabBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid var(--color-border, #e5e7eb)",
  marginBottom: 12,
};

const tabRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 4,
};

const tabStyle: React.CSSProperties = {
  padding: "8px 12px",
  background: "transparent",
  border: "none",
  borderBottom: "2px solid transparent",
  cursor: "pointer",
  fontSize: 13,
  color: "inherit",
};

const activeTabStyle: React.CSSProperties = {
  ...tabStyle,
  borderBottomColor: "var(--color-accent, #2563eb)",
  fontWeight: 600,
};

const windowPickerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "0 0 6px 0",
};

const chipStyle: React.CSSProperties = {
  padding: "2px 8px",
  borderRadius: 999,
  border: "1px solid var(--color-border, #e5e7eb)",
  background: "transparent",
  cursor: "pointer",
  fontSize: 11,
  color: "inherit",
};

const activeChipStyle: React.CSSProperties = {
  ...chipStyle,
  background: "var(--color-accent, #2563eb)",
  color: "white",
  borderColor: "transparent",
};

const tabBodyStyle: React.CSSProperties = {
  paddingTop: 8,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
  marginTop: 8,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  borderBottom: "1px solid var(--color-border, #e5e7eb)",
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  opacity: 0.7,
};

const thNumStyle: React.CSSProperties = { ...thStyle, textAlign: "right" };

const tdStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderBottom: "1px solid var(--color-border-subtle, rgba(0,0,0,0.05))",
  verticalAlign: "top",
};

const tdNumStyle: React.CSSProperties = { ...tdStyle, textAlign: "right" };

const trWarnStyle: React.CSSProperties = {
  background: "rgba(217, 119, 6, 0.08)",
};

const trOrphanStyle: React.CSSProperties = {
  opacity: 0.55,
};

const failuresHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  margin: "6px 0",
  fontSize: 12,
};

const toggleLabelStyle: React.CSSProperties = {
  fontSize: 11,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  opacity: 0.75,
  cursor: "pointer",
};

const orphanBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  marginLeft: 6,
  padding: "0 5px",
  fontSize: 9,
  borderRadius: 999,
  border: "1px solid var(--color-border, #e5e7eb)",
  textTransform: "uppercase",
  letterSpacing: 0.4,
  opacity: 0.8,
};

const sourceBannerStyle: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.6,
  marginBottom: 6,
};

const sourceBannerWarnStyle: React.CSSProperties = {
  fontSize: 12,
  padding: "8px 10px",
  borderRadius: 4,
  background: "rgba(217, 119, 6, 0.08)",
  color: "var(--color-warning, #d97706)",
  marginBottom: 12,
};

const detailLineStyle: React.CSSProperties = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: 360,
};

const revealButtonStyle: React.CSSProperties = {
  marginTop: 2,
  padding: "1px 6px",
  fontSize: 10,
  background: "transparent",
  border: "1px solid var(--color-border, #e5e7eb)",
  borderRadius: 3,
  cursor: "pointer",
  color: "inherit",
};

const hashStyle: React.CSSProperties = {
  display: "block",
  marginTop: 4,
  fontSize: 11,
  opacity: 0.8,
  wordBreak: "break-all",
};

const pillErrorStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "1px 6px",
  fontSize: 10,
  borderRadius: 999,
  background: "rgba(185, 28, 28, 0.12)",
  color: "var(--color-danger, #b91c1c)",
  textTransform: "uppercase",
};

const pillTimeoutStyle: React.CSSProperties = {
  ...pillErrorStyle,
  background: "rgba(217, 119, 6, 0.12)",
  color: "var(--color-warning, #d97706)",
};

const mcpServerStyle: React.CSSProperties = {
  marginTop: 8,
  padding: "6px 8px",
  borderRadius: 4,
  border: "1px solid var(--color-border-subtle, rgba(0,0,0,0.06))",
};

const mcpSummaryStyle: React.CSSProperties = {
  cursor: "pointer",
};

const mcpToolListStyle: React.CSSProperties = {
  marginTop: 6,
  paddingLeft: 18,
  fontSize: 12,
};

const subtleTextStyle: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.6,
};

const errorTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--color-danger, #b91c1c)",
  padding: "8px 0",
};

const emptyStateStyle: React.CSSProperties = {
  padding: 24,
  textAlign: "center",
  fontSize: 13,
  opacity: 0.7,
};
