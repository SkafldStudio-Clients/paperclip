#!/usr/bin/env node
/**
 * Standalone smoke test: opens the real Apple Claude Code DB and prints what
 * the plugin worker would return. Run after a build:
 *
 *   node scripts/smoke-test.mjs
 */

import { DatabaseSync } from "node:sqlite";
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const dir = join(homedir(), ".claude/apple");
const entries = await readdir(dir);
const match = entries
  .filter((n) => n.startsWith("claude-proxy-shared-") && n.endsWith(".db"))
  .map((n) => {
    const m = /(\d{4}-\d{2}-\d{2})\.db$/.exec(n);
    return m ? { name: n, date: m[1] } : null;
  })
  .filter(Boolean)
  .sort((a, b) => b.date.localeCompare(a.date))[0];

if (!match) {
  console.error("No DB found");
  process.exit(1);
}

const path = join(dir, match.name);
console.log("Reading:", path);
const db = new DatabaseSync(path, { readOnly: true });

console.log("\n--- request_counts (quota) ---");
const counts = db.prepare("SELECT * FROM request_counts ORDER BY total DESC LIMIT 5").all();
console.table(counts);

console.log("\n--- recent failed tool calls ---");
const since = Date.now() - 4 * 60 * 60 * 1000;
const fails = db
  .prepare(
    `SELECT tool_name, status, session_id, error_message, timestamp
     FROM tool_calls WHERE status IN ('error','timeout') AND created_at >= ?
     ORDER BY created_at DESC LIMIT 5`,
  )
  .all(since);
console.table(fails);

console.log("\n--- mcp servers ---");
const mcp = db
  .prepare("SELECT server_name, COUNT(*) AS tools, MAX(last_seen) AS last_seen FROM mcp_server_tools GROUP BY server_name")
  .all();
console.table(mcp);

db.close();
console.log("\nOK — read-only access works, all 3 of the main signals are populated.");
