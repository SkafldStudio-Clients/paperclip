/**
 * Read-only SQL against the Apple Claude Code SQLite store.
 *
 * Every query is parameterized; we never interpolate user input. The reader
 * opens the file with `readonly: true` so even a buggy query cannot mutate
 * Apple's database.
 */

import type { DatabaseSync } from "node:sqlite";

import { MAX_ROWS } from "../constants.js";

export interface QuotaModelRow {
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

export interface FailedToolRow {
  id: number;
  sessionId: string | null;
  toolName: string;
  status: "error" | "timeout";
  errorMessage: string | null;
  executionTimeMs: number | null;
  timestamp: string;
  /** Hash-only by default; reader strips bodies for privacy. */
  inputHash: string | null;
  /** Proxy port the call was tracked against (used to detect orphaned proxies). */
  proxyPort: number | null;
}

export interface ActiveProxyPortRow {
  proxyPort: number;
}

export interface BlockedRequestRow {
  id: number;
  sessionId: string | null;
  model: string;
  hostname: string | null;
  reason: string | null;
  category: string | null;
  timestamp: string;
}

export interface McpToolRow {
  serverName: string;
  toolName: string;
  enabled: number;
  lastSeen: number;
}

export interface ActivityCountRow {
  sessionId: string | null;
  toolCalls: number;
  toolFailures: number;
  inferenceCalls: number;
  inferenceBlocked: number;
  firstSeen: string;
  lastSeen: string;
}

/** Quota / rate-limit status per model (always current — table is a counter). */
export function selectQuota(db: DatabaseSync): QuotaModelRow[] {
  const rows = db
    .prepare(
      `SELECT
         model,
         total,
         allowed,
         blocked,
         inference_total       AS inferenceTotal,
         inference_blocked     AS inferenceBlocked,
         network_total         AS networkTotal,
         network_blocked       AS networkBlocked,
         rate_limited_until    AS rateLimitedUntil,
         last_429_timestamp    AS last429Timestamp
       FROM request_counts
       ORDER BY total DESC`,
    )
    .all() as unknown as QuotaModelRow[];
  return rows;
}

/** Failed (`error` or `timeout`) tool calls within the given window. */
export function selectFailedTools(
  db: DatabaseSync,
  sinceEpochMs: number,
  limit: number = MAX_ROWS,
): FailedToolRow[] {
  return db
    .prepare(
      `SELECT
         id,
         session_id        AS sessionId,
         tool_name         AS toolName,
         status,
         error_message     AS errorMessage,
         execution_time_ms AS executionTimeMs,
         timestamp,
         tool_input_hash   AS inputHash,
         proxy_port        AS proxyPort
       FROM tool_calls
       WHERE status IN ('error', 'timeout')
         AND created_at >= ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(sinceEpochMs, limit) as unknown as FailedToolRow[];
}

/**
 * Proxy ports currently registered as live in `proxy_agents`.
 *
 * Used to detect "orphan" tool-call timeouts — tool_calls rows whose
 * proxy_port has gone away (the Paperclip-spawned claude session exited
 * before its PostToolUse callback completed, so the row is stuck pending
 * until Apple's 15-minute sweeper marks it as timeout).
 */
export function selectActiveProxyPorts(db: DatabaseSync): number[] {
  const rows = db
    .prepare(`SELECT proxy_port AS proxyPort FROM proxy_agents`)
    .all() as unknown as ActiveProxyPortRow[];
  return rows.map((row) => row.proxyPort);
}

export interface SessionLatestSuccessRow {
  sessionId: string;
  latestSuccessAt: number;
}

/**
 * For each session_id, the timestamp of its most recent successful tool call.
 *
 * Used to detect a third class of bookkeeping artifact: a UUID-session timeout
 * where the same session kept making successful tool calls AFTER the supposed
 * timeout. That proves Apple's PostToolUse callback simply dropped on the
 * floor — the agent never actually got stuck, the audit log just missed the
 * close-out. (Empirically about half of all UUID-session timeouts on a live
 * proxy match this pattern.)
 */
export function selectSessionLatestSuccess(
  db: DatabaseSync,
  sinceEpochMs: number,
): SessionLatestSuccessRow[] {
  return db
    .prepare(
      `SELECT
         session_id      AS sessionId,
         MAX(created_at) AS latestSuccessAt
       FROM tool_calls
       WHERE status = 'success'
         AND session_id IS NOT NULL
         AND created_at >= ?
       GROUP BY session_id`,
    )
    .all(sinceEpochMs) as unknown as SessionLatestSuccessRow[];
}

/** Blocked inference + network requests within the given window. */
export function selectBlockedRequests(
  db: DatabaseSync,
  sinceEpochMs: number,
  limit: number = MAX_ROWS,
): BlockedRequestRow[] {
  return db
    .prepare(
      `SELECT
         id,
         session_id AS sessionId,
         model,
         hostname,
         reason,
         category,
         timestamp
       FROM requests
       WHERE status = 'blocked'
         AND created_at >= ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(sinceEpochMs, limit) as unknown as BlockedRequestRow[];
}

/** Currently-registered MCP server tools and their last-seen heartbeat. */
export function selectMcpTools(db: DatabaseSync): McpToolRow[] {
  return db
    .prepare(
      `SELECT
         server_name AS serverName,
         tool_name   AS toolName,
         enabled,
         last_seen   AS lastSeen
       FROM mcp_server_tools
       ORDER BY server_name, tool_name`,
    )
    .all() as unknown as McpToolRow[];
}

/**
 * Per-session activity counts within the window — used to attribute Apple
 * activity to specific Paperclip agent runs after we join in JS.
 */
export function selectActivityBySession(
  db: DatabaseSync,
  sinceEpochMs: number,
  limit: number = MAX_ROWS,
): ActivityCountRow[] {
  return db
    .prepare(
      `SELECT
         session_id AS sessionId,
         SUM(CASE WHEN source = 'tool' THEN 1 ELSE 0 END) AS toolCalls,
         SUM(CASE WHEN source = 'tool' AND failed = 1 THEN 1 ELSE 0 END) AS toolFailures,
         SUM(CASE WHEN source = 'inference' THEN 1 ELSE 0 END) AS inferenceCalls,
         SUM(CASE WHEN source = 'inference' AND failed = 1 THEN 1 ELSE 0 END) AS inferenceBlocked,
         MIN(timestamp) AS firstSeen,
         MAX(timestamp) AS lastSeen
       FROM (
         SELECT
           session_id,
           'tool' AS source,
           CASE WHEN status IN ('error','timeout') THEN 1 ELSE 0 END AS failed,
           timestamp
         FROM tool_calls
         WHERE session_id IS NOT NULL AND created_at >= ?
         UNION ALL
         SELECT
           session_id,
           'inference' AS source,
           CASE WHEN status = 'blocked' THEN 1 ELSE 0 END AS failed,
           timestamp
         FROM requests
         WHERE session_id IS NOT NULL AND created_at >= ?
       )
       GROUP BY session_id
       ORDER BY lastSeen DESC
       LIMIT ?`,
    )
    .all(sinceEpochMs, sinceEpochMs, limit) as unknown as ActivityCountRow[];
}
