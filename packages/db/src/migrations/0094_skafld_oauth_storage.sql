-- Skafld fork addition: persistent storage for the MCP OAuth flow.
-- Replaces the in-memory client registry and pending-auth-code Map in
-- server/src/routes/mcp.ts with database-backed tables so:
--   - dynamic-client-registration entries survive restarts (claude.ai will
--     keep using the same client_id across deploys)
--   - redirect_uris are recorded and can be enforced at /authorize time
--   - authorization codes survive restarts within their TTL and the raw
--     code is never stored (only its hash, single-use via consumed_at)
--
-- Future upstream merges may need this file renumbered if upstream lands
-- their own 0094_* migration.
CREATE TABLE IF NOT EXISTS "oauth_clients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" text NOT NULL,
  "client_name" text,
  "redirect_uris" jsonb NOT NULL,
  "grant_types" jsonb NOT NULL,
  "token_endpoint_auth_method" text DEFAULT 'none' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oauth_auth_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code_hash" text NOT NULL,
  "client_id" text NOT NULL,
  "user_id" text NOT NULL,
  "redirect_uri" text NOT NULL,
  "code_challenge" text NOT NULL,
  "code_challenge_method" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_auth_codes_user_id_user_id_fk') THEN
    ALTER TABLE "oauth_auth_codes" ADD CONSTRAINT "oauth_auth_codes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_clients_client_id_unique_idx" ON "oauth_clients" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_auth_codes_code_hash_unique_idx" ON "oauth_auth_codes" USING btree ("code_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oauth_auth_codes_expires_at_idx" ON "oauth_auth_codes" USING btree ("expires_at");
