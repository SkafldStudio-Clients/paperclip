import { useEffect, useState } from "react";

/**
 * Maps an Apple Claude Code `session_id` back to a Paperclip agent run.
 *
 * The plugin worker can't reach Paperclip's REST API (no `http.outbound`
 * capability), so we do the lookup from the UI: plugin UI runs same-origin
 * inside the Paperclip app and inherits the board session, so a plain `fetch`
 * to `/api/companies/:id/heartbeat-runs` works without extra auth.
 */

const ATTRIBUTION_POLL_MS = 60_000;
const ATTRIBUTION_LIMIT = 200;

export interface SessionMatch {
  agentId: string;
  agentName: string;
  status: string;
  runId: string;
}

export type SessionAttribution = Map<string, SessionMatch>;

interface HeartbeatRunRow {
  id?: string;
  runId?: string;
  agentId?: string;
  agentName?: string | null;
  agentStatus?: string;
  sessionIdBefore?: string | null;
  sessionIdAfter?: string | null;
}

/**
 * Fetch recent heartbeat runs for the current company and turn them into a
 * `session_id → SessionMatch` map. Refreshes every minute.
 */
export function useSessionAttribution(companyId: string | null | undefined): SessionAttribution {
  const [map, setMap] = useState<SessionAttribution>(() => new Map());

  useEffect(() => {
    if (!companyId) {
      setMap(new Map());
      return;
    }

    let cancelled = false;

    async function refresh() {
      try {
        const response = await fetch(
          `/api/companies/${encodeURIComponent(companyId!)}/heartbeat-runs?limit=${ATTRIBUTION_LIMIT}`,
          { credentials: "same-origin" },
        );
        if (!response.ok) return;
        const payload = (await response.json()) as
          | HeartbeatRunRow[]
          | { runs?: HeartbeatRunRow[] };
        const runs = Array.isArray(payload) ? payload : payload.runs ?? [];

        const next: SessionAttribution = new Map();
        for (const run of runs) {
          const agentId = run.agentId ?? "";
          const runId = run.runId ?? run.id ?? "";
          if (!agentId || !runId) continue;
          const match: SessionMatch = {
            agentId,
            agentName: run.agentName ?? "(unnamed)",
            status: run.agentStatus ?? "unknown",
            runId,
          };
          if (run.sessionIdBefore) next.set(run.sessionIdBefore, match);
          if (run.sessionIdAfter) next.set(run.sessionIdAfter, match);
        }
        if (!cancelled) setMap(next);
      } catch {
        // Network errors are non-fatal — we degrade to unattributed display.
      }
    }

    void refresh();
    const id = window.setInterval(refresh, ATTRIBUTION_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [companyId]);

  return map;
}
