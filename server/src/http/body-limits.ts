export const DEFAULT_JSON_BODY_LIMIT = "10mb";
export const PORTABLE_JSON_BODY_LIMIT = "64mb";
export const PORTABLE_JSON_BODY_LIMIT_BYTES = 64 * 1024 * 1024;

/**
 * OAuth/MCP discovery, registration, authorize, and token endpoints only ever
 * receive small form payloads. Cap them tightly so unauthenticated callers
 * cannot use the unauthenticated OAuth surface to push large bodies through
 * the body parser before any auth check runs.
 */
export const OAUTH_BODY_LIMIT = "16kb";
