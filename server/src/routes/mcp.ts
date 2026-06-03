import { createHash, randomBytes } from "node:crypto";
import express, { Router, type Request, type Response } from "express";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { PaperclipApiClient, createToolDefinitions } from "@paperclipai/mcp-server";
import type { PaperclipMcpConfig } from "@paperclipai/mcp-server";
import type { Db } from "@paperclipai/db";
import { boardApiKeys, oauthAuthCodes, oauthClients } from "@paperclipai/db";
import { logger } from "../middleware/logger.js";
import { boardApiKeyExpiresAt, createBoardApiToken, hashBearerToken } from "../services/board-auth.js";
import { OAUTH_BODY_LIMIT } from "../http/body-limits.js";

// ─── MCP Streamable HTTP route ──────────────────────────────────────────────

export function mcpRoutes(opts: { serverPort: number }) {
  const router = Router();

  function buildMcpServer(apiKey: string): McpServer {
    const config: PaperclipMcpConfig = {
      apiUrl: `http://127.0.0.1:${opts.serverPort}/api`,
      apiKey,
      companyId: null,
      agentId: null,
      runId: null,
    };
    const server = new McpServer({ name: "paperclip", version: "0.1.0" });
    const client = new PaperclipApiClient(config);
    for (const tool of createToolDefinitions(client)) {
      server.tool(tool.name, tool.description, tool.schema.shape, tool.execute);
    }
    return server;
  }

  async function handleMcp(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    const apiKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    if (!apiKey) {
      res.status(401).json({ error: "Missing or invalid Authorization header" });
      return;
    }

    try {
      const server = buildMcpServer(apiKey);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on("close", () => { void transport.close(); void server.close(); });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      logger.error({ err }, "MCP request failed");
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal MCP error" });
      }
    }
  }

  router.post("/", handleMcp);
  router.get("/", handleMcp);
  router.delete("/", handleMcp);
  return router;
}

// ─── OAuth 2.0 Authorization Code + PKCE (for claude.ai connectors) ─────────

/**
 * Authorization codes are short-lived: claude.ai exchanges them within
 * seconds of issuance. RFC 6749 § 4.1.2 recommends ≤ 10 minutes; we use 2.
 */
const AUTH_CODE_TTL_MS = 2 * 60 * 1000;

function generateAuthCode(): string {
  return randomBytes(32).toString("hex");
}

function hashAuthCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function verifyPkce(codeVerifier: string, codeChallenge: string, method: string): boolean {
  if (method !== "S256") return false;
  const hash = createHash("sha256").update(codeVerifier).digest("base64url");
  return hash === codeChallenge;
}

function normalizeRedirectUris(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const value of input) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    // Reject anything that isn't an absolute http(s) URL — RFC 6749 § 3.1.2.
    try {
      const url = new URL(trimmed);
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      out.push(trimmed);
    } catch {
      continue;
    }
  }
  return out;
}

export interface McpOAuthDeps {
  publicUrl: string;
  db: Db;
  resolveSession: (req: Request) => Promise<{ userId: string; userName?: string } | null>;
}

export function mcpOAuthRoutes(opts: McpOAuthDeps) {
  const router = Router();
  // Tight body-size limits — the OAuth router is reachable unauthenticated,
  // and every endpoint here only ever sees small form/JSON payloads.
  router.use(express.urlencoded({ extended: false, limit: OAUTH_BODY_LIMIT }));
  router.use(express.json({ limit: OAUTH_BODY_LIMIT }));
  const issuer = opts.publicUrl.replace(/\/+$/, "");

  // ── Discovery endpoints ──

  router.get("/.well-known/oauth-authorization-server", (_req, res) => {
    res.json({
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      registration_endpoint: `${issuer}/oauth/register`,
      token_endpoint_auth_methods_supported: ["none"],
      grant_types_supported: ["authorization_code"],
      response_types_supported: ["code"],
      code_challenge_methods_supported: ["S256"],
      service_documentation: `${issuer}/api/health`,
    });
  });

  router.get("/.well-known/oauth-protected-resource", (_req, res) => {
    res.json({
      resource: `${issuer}/api/mcp`,
      authorization_servers: [issuer],
      bearer_methods_supported: ["header"],
    });
  });

  // ── Dynamic Client Registration (RFC 7591) ──
  // claude.ai registers once, then reuses the returned client_id across
  // authorization flows. We persist the client + its redirect_uris so we can
  // enforce the allowlist at /authorize time.

  router.post("/oauth/register", async (req, res) => {
    const clientName = typeof req.body?.client_name === "string" ? req.body.client_name : null;
    const redirectUris = normalizeRedirectUris(req.body?.redirect_uris);

    if (redirectUris.length === 0) {
      res.status(400).json({
        error: "invalid_redirect_uri",
        error_description: "redirect_uris must contain at least one absolute http(s) URL",
      });
      return;
    }

    const clientId = `mcp_${randomBytes(16).toString("hex")}`;
    try {
      await opts.db.insert(oauthClients).values({
        clientId,
        clientName,
        redirectUris,
        grantTypes: ["authorization_code"],
        tokenEndpointAuthMethod: "none",
      });
    } catch (err) {
      logger.error({ err }, "Failed to persist OAuth client registration");
      res.status(500).json({ error: "server_error" });
      return;
    }

    res.status(201).json({
      client_id: clientId,
      client_name: clientName ?? "mcp-client",
      redirect_uris: redirectUris,
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    });
  });

  async function loadClient(clientId: string | undefined | null) {
    if (!clientId) return null;
    const rows = await opts.db
      .select()
      .from(oauthClients)
      .where(eq(oauthClients.clientId, clientId))
      .limit(1);
    return rows[0] ?? null;
  }

  // ── Authorization endpoint ──

  router.get("/authorize", async (req, res) => {
    const {
      response_type,
      client_id,
      redirect_uri,
      code_challenge,
      code_challenge_method,
      state,
    } = req.query as Record<string, string | undefined>;

    if (response_type !== "code" || !client_id || !redirect_uri || !code_challenge) {
      res.status(400).send("Invalid authorization request");
      return;
    }

    const client = await loadClient(client_id);
    if (!client) {
      res.status(400).send("Unknown client_id — register at /oauth/register first");
      return;
    }
    if (!client.redirectUris.includes(redirect_uri)) {
      // Critical: do NOT redirect to redirect_uri here — that would defeat the
      // allowlist check. RFC 6749 § 3.1.2.4 says respond with an HTTP 400.
      res.status(400).send("redirect_uri is not registered for this client_id");
      return;
    }

    // Check if user is logged in via session cookie
    const session = await opts.resolveSession(req);
    if (!session) {
      const returnUrl = `${issuer}${req.originalUrl}`;
      res.redirect(`${issuer}/login?returnTo=${encodeURIComponent(returnUrl)}`);
      return;
    }

    // Render a minimal consent page
    const userName = session.userName ?? session.userId;
    const displayName = client.clientName ?? client.clientId;
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authorize — Paperclip</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
           display: flex; align-items: center; justify-content: center;
           min-height: 100vh; background: #f5f5f5; color: #1a1a1a; }
    .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,.08);
            padding: 2.5rem; max-width: 420px; width: 100%; }
    h1 { font-size: 1.25rem; margin-bottom: .5rem; }
    p { color: #555; font-size: .9rem; margin-bottom: 1.5rem; line-height: 1.5; }
    .user { font-weight: 600; color: #1a1a1a; }
    .actions { display: flex; gap: .75rem; }
    button { flex: 1; padding: .75rem 1rem; border-radius: 8px; font-size: .9rem;
             cursor: pointer; border: 1px solid #ddd; background: #fff; }
    button[type="submit"] { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
    button[type="submit"]:hover { background: #333; }
    .deny { color: #666; }
    .deny:hover { background: #f0f0f0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Authorize Claude</h1>
    <p>
      Allow <strong>${escapeHtml(displayName)}</strong> to access your Paperclip
      account as <span class="user">${escapeHtml(userName)}</span>?
    </p>
    <p>This will grant read and write access to your issues, agents, projects, and approvals.</p>
    <form method="POST" action="${issuer}/authorize">
      <input type="hidden" name="response_type" value="${escapeAttr(response_type ?? "")}" />
      <input type="hidden" name="client_id" value="${escapeAttr(client_id ?? "")}" />
      <input type="hidden" name="redirect_uri" value="${escapeAttr(redirect_uri ?? "")}" />
      <input type="hidden" name="code_challenge" value="${escapeAttr(code_challenge ?? "")}" />
      <input type="hidden" name="code_challenge_method" value="${escapeAttr(code_challenge_method ?? "")}" />
      <input type="hidden" name="state" value="${escapeAttr(state ?? "")}" />
      <div class="actions">
        <a href="${escapeAttr(redirect_uri)}?error=access_denied&state=${encodeURIComponent(state ?? "")}">
          <button type="button" class="deny">Deny</button>
        </a>
        <button type="submit">Authorize</button>
      </div>
    </form>
  </div>
</body>
</html>`);
  });

  // Handle consent form submission
  router.post("/authorize", async (req, res) => {
    const {
      client_id,
      redirect_uri,
      code_challenge,
      code_challenge_method,
      state,
    } = req.body as Record<string, string | undefined>;

    if (!client_id || !redirect_uri || !code_challenge) {
      res.status(400).send("Invalid authorization request");
      return;
    }

    // Re-validate client + redirect_uri on the consent submission. The form
    // could have been tampered with between the GET and the POST (open form),
    // and we never trust user-controlled input across a request boundary.
    const client = await loadClient(client_id);
    if (!client || !client.redirectUris.includes(redirect_uri)) {
      res.status(400).send("Invalid client_id or redirect_uri");
      return;
    }

    const session = await opts.resolveSession(req);
    if (!session) {
      res.status(401).send("Session expired — please try again");
      return;
    }

    const code = generateAuthCode();
    const codeHash = hashAuthCode(code);
    try {
      await opts.db.insert(oauthAuthCodes).values({
        codeHash,
        clientId: client.clientId,
        userId: session.userId,
        redirectUri: redirect_uri,
        codeChallenge: code_challenge,
        codeChallengeMethod: code_challenge_method ?? "S256",
        expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
      });
    } catch (err) {
      logger.error({ err }, "Failed to persist OAuth authorization code");
      res.status(500).send("Failed to issue authorization code");
      return;
    }

    // Redirect back to claude.ai with the code
    const url = new URL(redirect_uri);
    url.searchParams.set("code", code);
    if (state) url.searchParams.set("state", state);
    res.redirect(url.toString());
  });

  // ── Token endpoint ──

  router.post("/oauth/token", async (req, res) => {
    const grantType = req.body?.grant_type;

    if (grantType !== "authorization_code") {
      // Only authorization_code is supported. The previous client_credentials
      // branch echoed the caller's client_secret straight back as an
      // access_token and was effectively an open token endpoint — removed.
      res.status(400).json({ error: "unsupported_grant_type" });
      return;
    }

    const code = typeof req.body?.code === "string" ? req.body.code : null;
    const codeVerifier = typeof req.body?.code_verifier === "string" ? req.body.code_verifier : null;
    const redirectUri = typeof req.body?.redirect_uri === "string" ? req.body.redirect_uri : null;
    const clientId = typeof req.body?.client_id === "string" ? req.body.client_id : null;

    if (!code || !codeVerifier) {
      res.status(400).json({ error: "invalid_request", error_description: "code and code_verifier are required" });
      return;
    }

    // Atomic single-use: claim the code by setting consumed_at in a single
    // UPDATE that filters out already-consumed and expired rows. Two
    // concurrent token requests with the same code race on this UPDATE; one
    // wins and gets a row back, the other gets nothing.
    const now = new Date();
    const codeHash = hashAuthCode(code);
    const claimed = await opts.db
      .update(oauthAuthCodes)
      .set({ consumedAt: now })
      .where(
        and(
          eq(oauthAuthCodes.codeHash, codeHash),
          isNull(oauthAuthCodes.consumedAt),
          gt(oauthAuthCodes.expiresAt, now),
        ),
      )
      .returning();

    const pending = claimed[0];
    if (!pending) {
      res.status(400).json({ error: "invalid_grant", error_description: "Authorization code is invalid, expired, or already used" });
      return;
    }

    if (clientId && clientId !== pending.clientId) {
      res.status(400).json({ error: "invalid_grant", error_description: "client_id mismatch" });
      return;
    }
    if (redirectUri && redirectUri !== pending.redirectUri) {
      res.status(400).json({ error: "invalid_grant", error_description: "redirect_uri mismatch" });
      return;
    }
    if (!verifyPkce(codeVerifier, pending.codeChallenge, pending.codeChallengeMethod)) {
      res.status(400).json({ error: "invalid_grant", error_description: "PKCE verification failed" });
      return;
    }

    try {
      const token = createBoardApiToken();
      const keyHash = hashBearerToken(token);
      await opts.db.insert(boardApiKeys).values({
        userId: pending.userId,
        name: "claude-ai-connector",
        keyHash,
        expiresAt: boardApiKeyExpiresAt(),
      });

      // Best-effort cleanup of expired rows. Doing it here keeps the table
      // bounded without a separate cron — the OAuth flow only fires when a
      // user is actively authorizing a client, so the call rate is low.
      await opts.db
        .delete(oauthAuthCodes)
        .where(lt(oauthAuthCodes.expiresAt, new Date(now.getTime() - 60 * 60 * 1000)));

      res.json({
        access_token: token,
        token_type: "Bearer",
        expires_in: 30 * 24 * 60 * 60, // 30 days (board key TTL)
      });
    } catch (err) {
      logger.error({ err }, "Failed to create board API key during OAuth exchange");
      res.status(500).json({ error: "server_error", error_description: "Failed to create access token" });
    }
  });

  return router;
}

// ── HTML helpers ──

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
