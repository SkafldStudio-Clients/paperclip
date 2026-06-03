import { pgTable, uuid, text, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Registered MCP OAuth clients. Created by `POST /oauth/register` (RFC 7591
 * Dynamic Client Registration) and consulted by `/authorize` and
 * `/oauth/token` to validate `client_id` and `redirect_uri`.
 *
 * Skafld fork addition — not present upstream. Lives in the same migrations
 * stream as upstream tables; future upstream migrations may need renumbering
 * during merges.
 */
export const oauthClients = pgTable(
  "oauth_clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: text("client_id").notNull(),
    clientName: text("client_name"),
    redirectUris: jsonb("redirect_uris").notNull().$type<readonly string[]>(),
    grantTypes: jsonb("grant_types").notNull().$type<readonly string[]>(),
    tokenEndpointAuthMethod: text("token_endpoint_auth_method").notNull().default("none"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    clientIdUniqueIdx: uniqueIndex("oauth_clients_client_id_unique_idx").on(table.clientId),
  }),
);
