/**
 * Classifier for "failed" tool calls reported by Apple Claude Code.
 *
 * Background — why this matters:
 *
 * Apple's `tool_calls` table is NOT a tool-outcome log. Empirically,
 * `execution_time_ms` is NULL for every row in the table; only `status`
 * carries information, and that status simply tracks the two-callback
 * audit-hook handshake (PreToolUse + PostToolUse):
 *
 *   - `success` — both PreToolUse and PostToolUse hooks called back to the
 *                 proxy within 15 minutes.
 *   - `timeout` — PreToolUse called back but PostToolUse never did within
 *                 15 minutes; Apple's sweeper flips the row.
 *   - `error`   — PreToolUse called back with an explicit error flag.
 *   - `pending` — PreToolUse called back; PostToolUse may still arrive.
 *
 * That means a `timeout` row says **nothing** about whether the actual tool
 * call succeeded — it only says the audit-trail close-out callback was lost.
 *
 * We classify rows into:
 *   - `real`   — UUID-session, live-proxy timeout where the same session has
 *                NOT continued to operate. These are the only rows that might
 *                represent something worth investigating, though in practice
 *                they're almost always just the tail-end of a sessions that
 *                ended cleanly after the last logged tool call.
 *   - `orphan` — Everything else. Three sub-reasons:
 *                  1. Synthetic `shell-*` session id (hook bookkeeping that
 *                     fired before the agent registered).
 *                  2. proxy_port no longer alive (the Paperclip-spawned
 *                     `claude` exited before PostToolUse landed).
 *                  3. Same session continued to log successful tool calls
 *                     after this row was marked timeout (proving the
 *                     PostToolUse callback simply dropped on the floor).
 */

import type { FailedToolRow } from "./apple-db/queries.js";

export type FailureClass = "real" | "orphan";

/**
 * Session IDs that begin with `shell-` are not real claude session UUIDs —
 * they're synthetic IDs the audit hook generates before the agent has
 * registered itself in `proxy_agents`. These rows describe hook bookkeeping,
 * not user-visible tool failures.
 */
export function isSyntheticSessionId(sessionId: string | null): boolean {
  if (!sessionId) return false;
  return sessionId.startsWith("shell-");
}

export interface ClassifiedFailedTool extends FailedToolRow {
  classification: FailureClass;
  /** Human-readable explanation if classification is `orphan`. */
  orphanReason: string | null;
}

/**
 * Classify each failed-tool row by combining several "this is bookkeeping
 * noise, not a real failure" signals.
 *
 * @param rows                Raw failure rows from `selectFailedTools`.
 * @param activeProxyPorts    Set of currently-registered proxy_ports.
 * @param sessionLatestSuccess  Map of session_id → epoch-ms of latest success
 *                              from same window. Used to detect timeouts on a
 *                              live session that kept working.
 */
export function classifyFailedTools(
  rows: FailedToolRow[],
  activeProxyPorts: ReadonlySet<number>,
  sessionLatestSuccess: ReadonlyMap<string, number>,
): ClassifiedFailedTool[] {
  return rows.map((row) => {
    // Rule 1 — synthetic hook session id.
    if (isSyntheticSessionId(row.sessionId)) {
      return {
        ...row,
        classification: "orphan",
        orphanReason: "synthetic session id (hook bookkeeping artifact)",
      };
    }

    // Only timeouts can be bookkeeping artifacts past this point; `error`
    // rows are kept as-is (they're rare and represent real hook errors).
    if (row.status === "timeout") {
      // Rule 2 — proxy is gone (short-lived Paperclip agent run).
      if (row.proxyPort != null && !activeProxyPorts.has(row.proxyPort)) {
        return {
          ...row,
          classification: "orphan",
          orphanReason: `proxy_port ${row.proxyPort} is no longer live`,
        };
      }

      // Rule 3 — session kept working after this row was marked timeout.
      // Apple's sweeper flips a row at created_at + 15min, so any success
      // logged on the same session more than 10min after this row was
      // created is proof the session wasn't actually stuck — the
      // PostToolUse callback simply dropped.
      const sid = row.sessionId;
      if (sid !== null) {
        const latestSuccess = sessionLatestSuccess.get(sid);
        const rowCreatedAtMs = Date.parse(row.timestamp);
        if (
          latestSuccess !== undefined &&
          Number.isFinite(rowCreatedAtMs) &&
          latestSuccess > rowCreatedAtMs + 10 * 60 * 1000
        ) {
          return {
            ...row,
            classification: "orphan",
            orphanReason:
              "session continued logging successful tool calls after this row was swept (PostToolUse callback dropped)",
          };
        }
      }
    }

    return {
      ...row,
      classification: "real",
      orphanReason: null,
    };
  });
}

export interface FailureCounts {
  real: number;
  orphan: number;
  total: number;
}

export function summarizeFailureCounts(
  classified: ReadonlyArray<{ classification: FailureClass }>,
): FailureCounts {
  let real = 0;
  let orphan = 0;
  for (const row of classified) {
    if (row.classification === "real") real += 1;
    else orphan += 1;
  }
  return { real, orphan, total: real + orphan };
}
