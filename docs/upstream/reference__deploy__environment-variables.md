\# Environment Variables

This page lists the environment variables Paperclip reads for server configuration and the variables it injects into agent processes at runtime.

Use it when you are wiring a deployment, debugging a startup issue, or checking what an adapter can see inside its process environment.

\-\-\-

\## Server Configuration

\| Variable \| Default \| Meaning \|
\|---\|---\|---\|
\| \`PORT\` \| \`3100\` \| Server port \|
\| \`HOST\` \| \`127.0.0.1\` \| Server host binding \|
\| \`DATABASE\_URL\` \| embedded PostgreSQL \| PostgreSQL connection string \|
\| \`DATABASE\_MIGRATION\_URL\` \| falls back to \`DATABASE\_URL\` \| Optional PostgreSQL URL used only when running migrations — useful when your runtime user lacks DDL rights and a separate role applies schema changes. \|
\| \`PAPERCLIP\_HOME\` \| \`~/.paperclip\` \| Base directory for all Paperclip data \|
\| \`PAPERCLIP\_INSTANCE\_ID\` \| \`default\` \| Instance identifier for multiple local instances \|
\| \`PAPERCLIP\_DEPLOYMENT\_MODE\` \| \`local\_trusted\` \| Runtime mode override \|
\| \`SERVE\_UI\` \| \`true\` (from \`server.serveUi\` in \`config.json\`) \| When set, overrides the file-config flag that controls whether the server serves the bundled UI. \`SERVE\_UI=true\` enables it; \`SERVE\_UI=false\` disables it. \|
\| \`PAPERCLIP\_BIND\` \| inferred from \`HOST\` \| Bind mode for the server socket. One of the values in \`BIND\_MODES\` (see \`packages/shared\`); overrides \`server.bind\` in \`config.json\`. \|
\| \`PAPERCLIP\_BIND\_HOST\` \| inferred \| Custom host when \`PAPERCLIP\_BIND\` is set to a custom mode; overrides \`server.customBindHost\`. \|
\| \`PAPERCLIP\_TAILNET\_BIND\_HOST\` \| auto-detected via \`tailscale ip -4\` \| Tailnet IPv4 address the server binds to when bind mode is \`tailnet\`. Set explicitly to skip the \`tailscale\` CLI probe. \|

\> \*\*Note:\*\* \`DATABASE\_URL\` is the main switch between the embedded database and external PostgreSQL.

\-\-\-

\## Deployment And Auth

These variables matter most once you move beyond a default local install.

\| Variable \| Meaning \|
\|---\|---\|
\| \`PAPERCLIP\_PUBLIC\_URL\` \| Canonical public URL for invites, redirects, and auth origin wiring. \|
\| \`PAPERCLIP\_AUTH\_PUBLIC\_BASE\_URL\` \| Explicit auth base URL when you want Better Auth to use a fixed public origin. \|
\| \`BETTER\_AUTH\_URL\` \| Alternate Better Auth base URL input. \|
\| \`BETTER\_AUTH\_SECRET\` \| Signing secret for Better Auth sessions and tokens. Falls back to \`PAPERCLIP\_AGENT\_JWT\_SECRET\` when unset; the server refuses to start if neither is configured. For local development the \`.env.example\` ships \`paperclip-dev-secret\`. \|
\| \`BETTER\_AUTH\_BASE\_URL\` \| Alternate Better Auth base URL input used by some deployments. \|
\| \`BETTER\_AUTH\_TRUSTED\_ORIGINS\` \| Comma-separated allowlist of trusted auth origins. \|
\| \`PAPERCLIP\_AGENT\_JWT\_SECRET\` \| Secret used to mint agent API JWTs. Required for local adapter auth. \|
\| \`PAPERCLIP\_AGENT\_JWT\_TTL\_SECONDS\` \| Agent JWT lifetime in seconds. \|
\| \`PAPERCLIP\_AGENT\_JWT\_ISSUER\` \| Agent JWT issuer. \|
\| \`PAPERCLIP\_AGENT\_JWT\_AUDIENCE\` \| Agent JWT audience. \|

Related deployment variables:

\| Variable \| Meaning \|
\|---\|---\|
\| \`PAPERCLIP\_DEPLOYMENT\_EXPOSURE\` \| Exposure policy override, typically \`private\` or \`public\` in authenticated mode. \|
\| \`PAPERCLIP\_AUTH\_BASE\_URL\_MODE\` \| Base URL handling mode, such as \`auto\` or \`explicit\`. \|
\| \`PAPERCLIP\_ALLOWED\_HOSTNAMES\` \| Comma-separated allowlist for authenticated/private host validation. \|

\> \*\*Tip:\*\* If \`paperclipai doctor\` is failing on hostnames, redirects, or auth origins, inspect this group first.

\-\-\-

\## Secrets

\| Variable \| Meaning \|
\|---\|---\|
\| \`PAPERCLIP\_SECRETS\_MASTER\_KEY\` \| 32-byte encryption key as base64, hex, or raw \|
\| \`PAPERCLIP\_SECRETS\_MASTER\_KEY\_FILE\` \| Path to the local key file \|
\| \`PAPERCLIP\_SECRETS\_STRICT\_MODE\` \| Require secret refs for server-side env bindings. Does not apply to \`paperclipai configure --section llm\` or \`config.llm.apiKey\`. \|

These values are covered in more detail in \[Secrets\](./secrets.md).

\-\-\-

\## Storage

\| Variable \| Meaning \|
\|---\|---\|
\| \`PAPERCLIP\_STORAGE\_PROVIDER\` \| Storage backend, usually \`local\_disk\` or \`s3\`. \|
\| \`PAPERCLIP\_STORAGE\_LOCAL\_DIR\` \| Base directory for local-disk storage. \|
\| \`PAPERCLIP\_STORAGE\_S3\_BUCKET\` \| S3 bucket name. \|
\| \`PAPERCLIP\_STORAGE\_S3\_REGION\` \| S3 region. \|
\| \`PAPERCLIP\_STORAGE\_S3\_ENDPOINT\` \| Custom S3-compatible endpoint for MinIO, R2, and similar providers. \|
\| \`PAPERCLIP\_STORAGE\_S3\_PREFIX\` \| Optional object key prefix. \|
\| \`PAPERCLIP\_STORAGE\_S3\_FORCE\_PATH\_STYLE\` \| Enable path-style S3 requests when the provider needs them. \|

\-\-\-

\## Scheduler

\| Variable \| Default \| Meaning \|
\|---\|---\|---\|
\| \`HEARTBEAT\_SCHEDULER\_ENABLED\` \| \`true\` \| Enables or disables timer-based scheduling. \|
\| \`HEARTBEAT\_SCHEDULER\_INTERVAL\_MS\` \| \`30000\` \| Scheduler poll interval in milliseconds. \|

\-\-\-

\## Telemetry & Feedback Export

These variables control where the server forwards operator-submitted feedback (and the deprecated telemetry channel that backs the same export pipeline). They are read by \`server/src/config.ts\` and are only consulted when you want to ship feedback events off your instance to a separate collector.

\| Variable \| Default \| Meaning \|
\|---\|---\|---\|
\| \`PAPERCLIP\_FEEDBACK\_EXPORT\_BACKEND\_URL\` \| unset \| URL of the external feedback collector. When set, the server forwards \`paperclipai feedback\` submissions to this endpoint. \|
\| \`PAPERCLIP\_FEEDBACK\_EXPORT\_BACKEND\_TOKEN\` \| unset \| Bearer token used to authenticate the forwarding request. \|
\| \`PAPERCLIP\_TELEMETRY\_BACKEND\_URL\` \| unset \| Legacy alias for \`PAPERCLIP\_FEEDBACK\_EXPORT\_BACKEND\_URL\`. Honoured for backwards compatibility — set the feedback variant in new deployments. \|
\| \`PAPERCLIP\_TELEMETRY\_BACKEND\_TOKEN\` \| unset \| Legacy alias for \`PAPERCLIP\_FEEDBACK\_EXPORT\_BACKEND\_TOKEN\`. \|

If neither variable is set, feedback submissions are stored locally and never leave the instance.

\-\-\-

\## Agent Runtime

The server injects these variables into agent processes when it starts a run:

\| Variable \| Meaning \|
\|---\|---\|
\| Variable \| Always set? \| Meaning \|
\|---\|---\|---\|
\| \`PAPERCLIP\_AGENT\_ID\` \| yes \| Agent ID. \|
\| \`PAPERCLIP\_COMPANY\_ID\` \| yes \| Company ID. \|
\| \`PAPERCLIP\_API\_URL\` \| yes \| Paperclip API base URL. \|
\| \`PAPERCLIP\_API\_KEY\` \| local adapters \| Short-lived JWT for API auth. Use as \`Authorization: Bearer $PAPERCLIP\_API\_KEY\`. For non-local adapters, the operator sets this in adapter config. \|
\| \`PAPERCLIP\_RUN\_ID\` \| yes \| Current heartbeat run ID. Pass back as the \`X-Paperclip-Run-Id\` header on any request that mutates an issue, so server-side audit log entries link to this run. \|
\| \`PAPERCLIP\_TASK\_ID\` \| wake-driven \| Issue that triggered the wake. Empty for scheduled or unsolicited wakes. \|
\| \`PAPERCLIP\_WAKE\_REASON\` \| wake-driven \| Why this run was triggered. See enum below. \|
\| \`PAPERCLIP\_WAKE\_COMMENT\_ID\` \| comment wakes \| Specific comment that triggered the wake (set with \`issue\_commented\` and \`issue\_comment\_mentioned\`). \|
\| \`PAPERCLIP\_WAKE\_PAYLOAD\_JSON\` \| some adapters \| Inline JSON wake payload: a compact issue summary plus the ordered batch of new comment payloads. Adapters that inject this let an agent skip the initial \`GET /api/issues/:id\` and \`GET /api/issues/:id/comments\` round-trips on comment wakes. \|
\| \`PAPERCLIP\_APPROVAL\_ID\` \| approval wakes \| Resolved approval ID. \|
\| \`PAPERCLIP\_APPROVAL\_STATUS\` \| approval wakes \| Approval decision. \|
\| \`PAPERCLIP\_LINKED\_ISSUE\_IDS\` \| optional \| Comma-separated linked issue IDs. \|

Use these values when your agent runtime needs to authenticate back to Paperclip or understand what context triggered the run.

\### \`PAPERCLIP\_WAKE\_REASON\` values

\| Value \| When it fires \|
\|---\|---\|
\| \`issue\_assigned\` \| A task was newly assigned to this agent. \|
\| \`issue\_commented\` \| A new comment was posted on an issue this agent owns. The triggering comment id is in \`PAPERCLIP\_WAKE\_COMMENT\_ID\`. \|
\| \`issue\_comment\_mentioned\` \| The agent was @-mentioned in a comment on an issue it does not own. \|
\| \`issue\_blockers\_resolved\` \| Every issue listed in this issue's \`blockedBy\` reached \`done\`. \|
\| \`issue\_children\_completed\` \| All direct children of this issue reached a terminal state (\`done\` or \`cancelled\`). \|
\| \`approval\_resolved\` \| An approval the agent requested was approved or rejected. \`PAPERCLIP\_APPROVAL\_ID\` and \`PAPERCLIP\_APPROVAL\_STATUS\` are populated. \|
\| \`scheduled\` \| A scheduled run from the heartbeat scheduler or a routine cron. \|
\| \`assignment\` \| Generic assignment-triggered run with no more specific reason. \|

When Paperclip realizes an execution workspace, it can also inject workspace-specific variables such as:

\- \`PAPERCLIP\_WORKSPACE\_CWD\`
\- \`PAPERCLIP\_WORKSPACE\_PATH\`
\- \`PAPERCLIP\_WORKSPACE\_REPO\_ROOT\`
\- \`PAPERCLIP\_WORKSPACE\_BRANCH\`
\- \`PAPERCLIP\_PROJECT\_ID\`
\- \`PAPERCLIP\_ISSUE\_ID\`

Those are mainly useful for adapter authors and agent-side tooling that need direct access to the resolved execution workspace.

\> \*\*Audit trail:\*\* Every mutating API request from an agent run should include the \`X-Paperclip-Run-Id: $PAPERCLIP\_RUN\_ID\` header. The server uses it to attribute issue updates, comments, checkouts, and subtasks to the heartbeat run that produced them. Read-only requests do not require it.

\-\-\-

\## LLM Provider Keys

\| Variable \| Meaning \|
\|---\|---\|
\| \`ANTHROPIC\_API\_KEY\` \| Anthropic API key for \`claude\_local\` \|
\| \`OPENAI\_API\_KEY\` \| OpenAI API key for \`codex\_local\` \|
\| \`GEMINI\_API\_KEY\` \| Gemini API key for \`gemini\_local\` \|
\| \`GOOGLE\_API\_KEY\` \| Alternate Google API key path for \`gemini\_local\` \|

\> \*\*Tip:\*\* If an adapter test is failing, start by checking whether the expected provider key is present in the process environment.