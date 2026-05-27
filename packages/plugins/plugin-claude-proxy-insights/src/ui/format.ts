/**
 * Small formatting helpers shared between the dashboard widget and the full
 * insights page. Keep these stateless so they're trivially testable.
 */

const RELATIVE_TIME_UNITS: Array<{ ms: number; label: string }> = [
  { ms: 365 * 24 * 60 * 60 * 1000, label: "y" },
  { ms: 30 * 24 * 60 * 60 * 1000, label: "mo" },
  { ms: 24 * 60 * 60 * 1000, label: "d" },
  { ms: 60 * 60 * 1000, label: "h" },
  { ms: 60 * 1000, label: "m" },
  { ms: 1000, label: "s" },
];

/**
 * Render an absolute time as "Xd ago" / "Xh ago" / "Xm ago". Uses short suffix
 * so it fits comfortably in a dashboard widget column.
 */
export function formatRelativeFromEpoch(
  epochMs: number | null | undefined,
  nowMs: number = Date.now(),
): string {
  if (epochMs == null || !Number.isFinite(epochMs)) return "—";
  const delta = nowMs - epochMs;
  if (delta < 0) {
    // Future timestamp (e.g. rate_limited_until)
    return `in ${formatDelta(-delta)}`;
  }
  return `${formatDelta(delta)} ago`;
}

export function formatDelta(deltaMs: number): string {
  if (deltaMs < 1000) return "0s";
  for (const unit of RELATIVE_TIME_UNITS) {
    if (deltaMs >= unit.ms) {
      const value = Math.floor(deltaMs / unit.ms);
      return `${value}${unit.label}`;
    }
  }
  return "0s";
}

/** Best-effort parse of either ISO-8601 strings or epoch ms numbers. */
export function toEpochMs(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Convert a model id like `anthropic.claude-opus-4-7` to a compact label. */
export function shortModelLabel(model: string): string {
  return model
    .replace(/^anthropic\./, "")
    .replace(/^claude-/, "")
    .replace(/-v\d+$/, "")
    .replace(/-\d{8,}/, "");
}

/** Cap a string at `limit` chars with an ellipsis. */
export function truncate(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`;
}
