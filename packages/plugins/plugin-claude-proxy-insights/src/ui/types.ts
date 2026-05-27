/**
 * Shapes returned by the worker `ctx.data.register` handlers.
 *
 * These mirror what `worker.ts` returns and what the UI consumes through
 * `usePluginData<T>(key)`. Keep them in sync.
 */

export interface ReaderStatusPayload {
  path: string | null;
  date: string | null;
  available: boolean;
  lastError: string | null;
  openedAt: number | null;
}

export interface QuotaRow {
  model: string;
  total: number;
  allowed: number;
  blocked: number;
  inferenceTotal: number;
  inferenceBlocked: number;
  networkTotal: number;
  networkBlocked: number;
  rateLimitedUntil: number | null;
  last429Timestamp: number | null;
}

export type FailureClassification = "real" | "orphan";

export interface FailedToolRowPayload {
  id: number;
  sessionId: string | null;
  toolName: string;
  status: "error" | "timeout";
  errorMessage: string | null;
  executionTimeMs: number | null;
  timestamp: string;
  inputHash: string | null;
  proxyPort: number | null;
  classification: FailureClassification;
  orphanReason: string | null;
}

export interface FailureCounts {
  real: number;
  orphan: number;
  total: number;
}

export interface BlockedRequestRowPayload {
  id: number;
  sessionId: string | null;
  model: string;
  hostname: string | null;
  reason: string | null;
  category: string | null;
  timestamp: string;
}

export interface McpServerGroup {
  server: string;
  tools: Array<{
    serverName: string;
    toolName: string;
    enabled: number;
    lastSeen: number;
  }>;
  lastSeen: number;
  enabledCount: number;
}

export interface ActivityCountPayload {
  sessionId: string | null;
  toolCalls: number;
  toolFailures: number;
  inferenceCalls: number;
  inferenceBlocked: number;
  firstSeen: string;
  lastSeen: string;
}

export interface SummaryPayload {
  source: ReaderStatusPayload;
  windowMs: number;
  totals: {
    /** Real tool failures — UUID session + (error OR timeout against a live proxy). */
    failedToolCalls: number;
    /** Bookkeeping artifacts — synthetic `shell-*` IDs or timeouts against dead proxies. */
    orphanToolCalls: number;
    /** failedToolCalls + orphanToolCalls (raw row count). */
    totalFailureRows: number;
    blockedRequests: number;
    mcpTools: number;
    mcpServers: number;
  };
  rateLimit: {
    activeModels: Array<{ model: string; until: number | null }>;
    last429AtEpochMs: number | null;
  };
  /** Only counts REAL failures, so it's actionable. */
  failuresByTool: Record<string, number>;
  blockedByHost: Record<string, number>;
}

export interface QuotaPayload {
  source: ReaderStatusPayload;
  rows: QuotaRow[];
}

export interface FailedToolsPayload {
  source: ReaderStatusPayload;
  windowMs: number;
  rows: FailedToolRowPayload[];
  counts: FailureCounts;
  sessionActivity: ActivityCountPayload[];
}

export interface BlockedNetworkPayload {
  source: ReaderStatusPayload;
  windowMs: number;
  rows: BlockedRequestRowPayload[];
}

export interface McpHealthPayload {
  source: ReaderStatusPayload;
  servers: McpServerGroup[];
  totalTools: number;
}
