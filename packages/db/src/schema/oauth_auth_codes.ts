import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { authUsers } from "./auth.js";

/**
 * Pending OAuth 2.0 authorization codes (RFC 6749 § 4.1.2 + RFC 7636 PKCE).
 *
 * Replaces the previous in-memory `pendingCodes` Map so that:
 *   - codes survive server restarts within their TTL
 *   - `consumedAt` enforces single-use atomically via the database
 *   - the raw code is never persisted; only `code_hash`
 *
 * Skafld fork addition — not present upstream.
 */
export const oauthAuthCodes = pgTable(
  "oauth_auth_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codeHash: text("code_hash").notNull(),
    clientId: text("client_id").notNull(),
    userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    redirectUri: text("redirect_uri").notNull(),
    codeChallenge: text("code_challenge").notNull(),
    codeChallengeMethod: text("code_challenge_method").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeHashUniqueIdx: uniqueIndex("oauth_auth_codes_code_hash_unique_idx").on(table.codeHash),
    expiresAtIdx: index("oauth_auth_codes_expires_at_idx").on(table.expiresAt),
  }),
);
