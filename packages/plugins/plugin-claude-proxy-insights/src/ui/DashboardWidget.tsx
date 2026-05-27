import { useEffect } from "react";
import {
  usePluginData,
  type PluginWidgetProps,
} from "@paperclipai/plugin-sdk/ui";

import { DATA_KEYS } from "../constants.js";
import { formatRelativeFromEpoch, shortModelLabel } from "./format.js";
import type { SummaryPayload } from "./types.js";

const POLL_INTERVAL_MS = 30_000;
const WIDGET_LABEL = "Claude proxy insights";

/**
 * Compact dashboard card showing:
 *   - data-source status (which Apple DB file we're reading, or "not found")
 *   - last-hour totals (failed tool calls, blocked requests, MCP tool count)
 *   - active model rate-limits, if any
 *
 * The full breakdown is available from the linked plugin page.
 */
export function ClaudeProxyInsightsWidget(_props: PluginWidgetProps) {
  const { data, loading, error, refresh } = usePluginData<SummaryPayload>(
    DATA_KEYS.SUMMARY,
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  if (loading && !data) {
    return (
      <section aria-label={WIDGET_LABEL}>
        <Header />
        <div style={subtleTextStyle}>Loading proxy insights…</div>
      </section>
    );
  }

  if (error) {
    return (
      <section aria-label={WIDGET_LABEL}>
        <Header />
        <div style={errorTextStyle}>{error.message}</div>
      </section>
    );
  }

  if (!data) {
    return (
      <section aria-label={WIDGET_LABEL}>
        <Header />
        <div style={subtleTextStyle}>No data yet.</div>
      </section>
    );
  }

  if (!data.source.available) {
    return (
      <section aria-label={WIDGET_LABEL}>
        <Header />
        <div style={subtleTextStyle}>
          Apple Claude Code is not installed or the proxy database wasn't found.
        </div>
        {data.source.lastError ? (
          <div style={errorTextStyle}>{data.source.lastError}</div>
        ) : null}
      </section>
    );
  }

  return (
    <section aria-label={WIDGET_LABEL}>
      <Header sourceDate={data.source.date} />
      <div style={statRowStyle}>
        <Stat
          label="Tool failures (1h)"
          value={data.totals.failedToolCalls}
          tone={data.totals.failedToolCalls > 0 ? "warn" : "ok"}
        />
        <Stat
          label="Blocked requests (1h)"
          value={data.totals.blockedRequests}
          tone={data.totals.blockedRequests > 0 ? "warn" : "ok"}
        />
        <Stat label="MCP tools" value={data.totals.mcpTools} />
        <Stat label="MCP servers" value={data.totals.mcpServers} />
      </div>

      {data.totals.orphanToolCalls > 0 ? (
        <div
          style={subtleTextStyle}
          title="Apple Claude Code's `tool_calls` table only tracks the PreToolUse→PostToolUse hook handshake; it never records actual tool execution time. A `timeout` row simply means the PostToolUse callback didn't reach the proxy within 15 minutes. We detect three causes — synthetic shell-* session ids, dead proxy ports (Paperclip's short-lived `claude` runs), and live sessions whose subsequent successful tool calls prove the PostToolUse hook just dropped on the floor. None of these represent a real tool failure."
        >
          + {data.totals.orphanToolCalls} dropped audit callbacks (not real
          failures)
        </div>
      ) : null}

      {data.rateLimit.activeModels.length > 0 ? (
        <div style={rateLimitBlockStyle}>
          <strong>Rate-limited:</strong>{" "}
          {data.rateLimit.activeModels.map((m, idx) => (
            <span key={m.model}>
              {idx > 0 ? ", " : ""}
              <code>{shortModelLabel(m.model)}</code>{" "}
              <span style={subtleTextStyle}>
                ({formatRelativeFromEpoch(m.until)})
              </span>
            </span>
          ))}
        </div>
      ) : null}

      {data.rateLimit.last429AtEpochMs != null ? (
        <div style={subtleTextStyle}>
          Last 429: {formatRelativeFromEpoch(data.rateLimit.last429AtEpochMs)}
        </div>
      ) : null}
    </section>
  );
}

function Header({ sourceDate }: { sourceDate?: string | null }) {
  return (
    <div style={headerStyle}>
      <strong>Claude proxy insights</strong>
      {sourceDate ? (
        <span style={subtleTextStyle}>{sourceDate}</span>
      ) : null}
    </div>
  );
}

interface StatProps {
  label: string;
  value: number;
  tone?: "ok" | "warn";
}

function Stat({ label, value, tone = "ok" }: StatProps) {
  return (
    <div style={statCellStyle}>
      <div style={tone === "warn" ? statValueWarnStyle : statValueStyle}>
        {value}
      </div>
      <div style={statLabelStyle}>{label}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline styles (avoid coupling to host CSS — keep this widget self-contained)
// ---------------------------------------------------------------------------

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: 8,
};

const statRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 12,
  marginBottom: 8,
};

const statCellStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  minWidth: 0,
};

const statValueStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 600,
  lineHeight: 1,
};

const statValueWarnStyle: React.CSSProperties = {
  ...statValueStyle,
  color: "var(--color-warning, #d97706)",
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.7,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "100%",
};

const subtleTextStyle: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.6,
};

const errorTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--color-danger, #b91c1c)",
};

const rateLimitBlockStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--color-warning, #d97706)",
  marginTop: 4,
};
