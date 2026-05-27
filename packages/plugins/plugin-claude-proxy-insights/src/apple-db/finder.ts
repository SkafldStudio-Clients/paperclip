import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Apple Claude Code stores per-day SQLite snapshots at
 *   ~/.claude/apple/claude-proxy-shared-<version>-<sha>-<YYYY-MM-DD>.db
 *
 * Multiple Apple Claude Code versions may coexist on the same machine, so two
 * files can share a date suffix while writing to different DBs. We pick the
 * "current" file by (1) preferring the most recent date suffix, then
 * (2) tie-breaking on filesystem mtime — the file the active proxy is writing
 * to is always the most recently touched.
 *
 * Day-boundary rollovers are handled by re-resolving on every poll cycle.
 */

const APPLE_DIR_RELATIVE = ".claude/apple";
const FILENAME_PREFIX = "claude-proxy-shared-";
const FILENAME_SUFFIX = ".db";
/** Captures the trailing YYYY-MM-DD before `.db`. */
const DATE_SUFFIX_RE = /(\d{4}-\d{2}-\d{2})\.db$/;

export interface ResolvedAppleDb {
  /** Absolute path to the SQLite file. */
  readonly path: string;
  /** YYYY-MM-DD parsed from the filename suffix. */
  readonly date: string;
  /** Filesystem mtime in epoch ms — used for tie-breaking same-day files. */
  readonly mtimeMs: number;
}

/** Override directory for testing — defaults to `~/.claude/apple`. */
export function getDefaultAppleDir(): string {
  return join(homedir(), APPLE_DIR_RELATIVE);
}

/**
 * Find the newest Apple Claude Code SQLite snapshot under the given directory.
 *
 * Returns `null` (rather than throwing) when the directory is missing or has
 * no matching files — Paperclip should run fine without Apple Claude Code
 * installed, and the UI surfaces this as a "not configured" state.
 */
export async function findLatestAppleDb(
  dir: string = getDefaultAppleDir(),
): Promise<ResolvedAppleDb | null> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return null;
  }

  const candidates: Array<{ name: string; date: string }> = [];
  for (const name of entries) {
    if (!name.startsWith(FILENAME_PREFIX) || !name.endsWith(FILENAME_SUFFIX)) {
      continue;
    }
    const match = DATE_SUFFIX_RE.exec(name);
    if (!match) continue;
    candidates.push({ name, date: match[1]! });
  }

  if (candidates.length === 0) return null;

  // First narrow to the newest date so we don't stat every historical file.
  candidates.sort((a, b) => b.date.localeCompare(a.date));
  const newestDate = candidates[0]!.date;
  const sameDay = candidates.filter((c) => c.date === newestDate);

  // Stat each same-day candidate and pick the most recently written.
  const stats = await Promise.all(
    sameDay.map(async (c) => {
      const fullPath = join(dir, c.name);
      try {
        const s = await stat(fullPath);
        return { path: fullPath, date: c.date, mtimeMs: s.mtimeMs };
      } catch {
        return null;
      }
    }),
  );

  const valid = stats.filter((s): s is ResolvedAppleDb => s !== null);
  if (valid.length === 0) return null;

  valid.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return valid[0] ?? null;
}
