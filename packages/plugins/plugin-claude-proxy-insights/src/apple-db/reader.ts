import { DatabaseSync } from "node:sqlite";

import { findLatestAppleDb, type ResolvedAppleDb } from "./finder.js";
import {
  selectActiveProxyPorts,
  selectActivityBySession,
  selectBlockedRequests,
  selectFailedTools,
  selectMcpTools,
  selectQuota,
  selectSessionLatestSuccess,
  type ActivityCountRow,
  type BlockedRequestRow,
  type FailedToolRow,
  type McpToolRow,
  type QuotaModelRow,
  type SessionLatestSuccessRow,
} from "./queries.js";

/**
 * Thin wrapper around an opened `node:sqlite` `DatabaseSync` that:
 *   - reopens the underlying file when the resolved path changes
 *     (handles Apple's per-day file rollover at midnight)
 *   - exposes typed query helpers
 *   - guarantees readonly mode so even a regression cannot mutate Apple's DB
 *
 * Plugin worker code should hold a single `AppleDbReader` for the worker
 * lifetime and call `withDb(fn)` on each request — that path is fast (sync
 * SQLite prepared-statements) and the connection is reused across calls.
 */

export interface ReaderStatus {
  /** Resolved DB path, if found. */
  readonly path: string | null;
  /** Date suffix of the file (YYYY-MM-DD). */
  readonly date: string | null;
  /** Whether the file was found and successfully opened. */
  readonly available: boolean;
  /** Last error encountered while opening, if any. */
  readonly lastError: string | null;
  /** Epoch ms of the last successful open. */
  readonly openedAt: number | null;
}

export class AppleDbReader {
  private db: DatabaseSync | null = null;
  private resolved: ResolvedAppleDb | null = null;
  private lastError: string | null = null;
  private openedAt: number | null = null;

  /** Close any open connection. Idempotent. */
  close(): void {
    if (this.db) {
      try {
        this.db.close();
      } catch {
        // Best-effort — the worker may be shutting down already.
      }
      this.db = null;
    }
    this.resolved = null;
    this.openedAt = null;
  }

  /**
   * Resolve the latest DB path; reopen the connection only if the path changed
   * or no connection is open yet.
   */
  private async ensureConnection(): Promise<DatabaseSync | null> {
    const latest = await findLatestAppleDb();
    if (!latest) {
      this.close();
      this.lastError = "No Apple Claude Code SQLite file found in ~/.claude/apple";
      return null;
    }

    if (this.db && this.resolved?.path === latest.path) {
      return this.db;
    }

    // Path changed (or first open) → reopen.
    if (this.db) {
      try {
        this.db.close();
      } catch {
        // ignore
      }
      this.db = null;
    }

    try {
      this.db = new DatabaseSync(latest.path, { readOnly: true });
      this.resolved = latest;
      this.openedAt = Date.now();
      this.lastError = null;
      return this.db;
    } catch (error) {
      this.db = null;
      this.resolved = null;
      this.openedAt = null;
      this.lastError = error instanceof Error ? error.message : String(error);
      return null;
    }
  }

  status(): ReaderStatus {
    return {
      path: this.resolved?.path ?? null,
      date: this.resolved?.date ?? null,
      available: this.db !== null,
      lastError: this.lastError,
      openedAt: this.openedAt,
    };
  }

  /** Run a synchronous SQL function against the latest DB; resolves null if unavailable. */
  async withDb<T>(fn: (db: DatabaseSync) => T): Promise<T | null> {
    const db = await this.ensureConnection();
    if (!db) return null;
    try {
      return fn(db);
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      // Drop the cached connection so the next call will reopen.
      this.close();
      return null;
    }
  }

  async readQuota(): Promise<QuotaModelRow[]> {
    return (await this.withDb((db) => selectQuota(db))) ?? [];
  }

  async readFailedTools(sinceEpochMs: number, limit?: number): Promise<FailedToolRow[]> {
    return (
      (await this.withDb((db) => selectFailedTools(db, sinceEpochMs, limit))) ?? []
    );
  }

  async readBlockedRequests(
    sinceEpochMs: number,
    limit?: number,
  ): Promise<BlockedRequestRow[]> {
    return (
      (await this.withDb((db) => selectBlockedRequests(db, sinceEpochMs, limit))) ?? []
    );
  }

  async readMcpTools(): Promise<McpToolRow[]> {
    return (await this.withDb((db) => selectMcpTools(db))) ?? [];
  }

  async readActivityBySession(
    sinceEpochMs: number,
    limit?: number,
  ): Promise<ActivityCountRow[]> {
    return (
      (await this.withDb((db) => selectActivityBySession(db, sinceEpochMs, limit))) ??
      []
    );
  }

  async readActiveProxyPorts(): Promise<number[]> {
    return (await this.withDb((db) => selectActiveProxyPorts(db))) ?? [];
  }

  async readSessionLatestSuccess(
    sinceEpochMs: number,
  ): Promise<SessionLatestSuccessRow[]> {
    return (
      (await this.withDb((db) => selectSessionLatestSuccess(db, sinceEpochMs))) ?? []
    );
  }
}
