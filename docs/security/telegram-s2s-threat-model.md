# Telegram server-to-server authentication

## Boundary and threats

The Telegram bot is an authenticated backend consumer, while `chat_id` is only the user-link identifier. The protected assets are portfolio/profile data and authorization identity. The principal threats are forged chat IDs, captured-request replay, broad credential reuse, secret leakage in URLs/logs, and unsafe rollback to 30-day web sessions.

## Contract and controls

- Every allowed `GET` request carries `chat_id`, Unix timestamp, random nonce, exact route scope and an HMAC-SHA256 signature in headers.
- The signature covers method, pathname, identity, timestamp, nonce and scope. Query strings never carry credentials.
- The API compares signatures with `timingSafeEqual`, accepts a current and optional previous secret during rotation, rejects requests outside a 60-second window and consumes each nonce once.
- Route scopes are allowlisted. Unknown methods/routes and scope mismatches fail closed.
- The linked user must exist and be active. Audit events hash the Telegram identity and never record signatures or secrets.
- `GET /api/auth/token-by-telegram` is permanently `410 Gone` and cannot be restored by a rollback flag.

The current replay cache is process-local, matching the single API instance in production. Before horizontal API scaling, move nonce consumption to a shared atomic store.

## Rollout, rotation and rollback

`TELEGRAM_S2S_AUTH_ENABLED` revokes the server-to-server channel. `TELEGRAM_S2S_SECRET` is the active key; `TELEGRAM_S2S_PREVIOUS_SECRET` supports a bounded overlap during rotation. Deploy writes one persistent random secret on the host and shares it only through protected environment files.

Legacy table-session authentication is deny-by-default. An emergency rollback requires both `LEGACY_SESSION_AUTH_ENABLED=true` and the consumer-specific flag. Telegram additionally requires `TELEGRAM_LEGACY_SESSION_ROLLBACK_ENABLED=true`; this can only accept an already-existing session and never reopens issuance.

## Verification evidence

Unit and E2E tests cover valid linkage, missing linkage, bad signatures, timestamp/replay rejection, insufficient scope, current/previous-key rotation, revocation, and the permanent absence of a durable token response.
