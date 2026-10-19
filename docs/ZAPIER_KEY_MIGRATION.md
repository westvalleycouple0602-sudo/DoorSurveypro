# Zapier organization-key migration

Source change only. No live keys were created, revoked, read, or changed. No
deployment or database migration was performed. Existing Zaps using the global
`ZAPIER_API_KEY` will stop authenticating once this change is deployed.

## Authentication and permissions

The existing `/api/zapier` URLs and success envelopes are retained. They now use
the shared API-key authenticator: hashed database lookup, revocation, expiration,
IP restrictions, key quota, and usage logging. The organization is taken only
from that verified key, never a body, query parameter, or browser session.

| Endpoint | Required scopes (all listed) |
| --- | --- |
| `GET /api/zapier/projects` | `projects:read` |
| `POST /api/zapier/projects` | `projects:write` |
| `GET /api/zapier/projects/:id` | `projects:read`, `openings:read`, `quotes:read` |
| `POST /api/zapier/projects/:projectId/openings` | `openings:write` |
| `POST /api/zapier/hubspot/sync-project/:projectId` | `projects:read`, `quotes:read`, `integrations:write` |

The detail response includes openings and costs, so it requires their read
permissions too. Resource wildcards supported by the shared authenticator remain
available; prefer the minimum explicit scopes over `*`.

Before returning related data, writing an opening, or initializing HubSpot, the
route verifies the project belongs to the key organization. Customer/location
references on new projects are checked too. HubSpot uses that organization's
configuration. No ownership or local account IDs are reassigned.

The machine router is mounted after general security/body parsing and before
Clerk/browser-session handling. Every route requires an API key; unknown paths
terminate instead of falling through to browser routes. Cookie CSRF protection
on browser routes is unchanged; no broad CSRF exemption was added. The existing
IP limiter remains, in addition to the shared per-key quota. Named key windows
map to 3600 seconds, 86400 seconds, or a fixed 30-day rolling window for `month`.
The shared Redis-unavailable behavior remains unchanged (quota degradation),
with the independent process-local Zapier IP limiter still present.

## Owner rollout checklist (not executed)

1. Keep Zaps paused while replacing credentials. First validate the branch in a
   disposable environment with representative keys/projects and sandbox HubSpot.
2. An owner/admin in the correct organization creates a dedicated key through
   the existing authenticated `POST /api/api-keys` endpoint. Normal Clerk and CSRF
   protections still apply to key management. Set the minimum scopes, appropriate
   expiry/quota, and compatible IP restrictions. The full key is shown only once.
3. Store the key only in Zapier's credential/header configuration, never in
   repository files, URLs, logs, or chat. Send `Authorization: Bearer <key>` or
   `X-API-Key: <key>` to the existing endpoint URL.
4. Validate each Zap with owned test records. Confirm invalid/expired/revoked keys
   fail; foreign project IDs and missing scopes fail without provider calls.
   List requests accept integer `limit` 1–100 and nonnegative integer `offset`.
5. Complete the application's remaining release gates before deploying. After a
   separately approved deployment and smoke test, re-enable Zaps deliberately.
6. Remove the unused global secret through the hosting provider's supported
   secrets interface when no external consumer still needs it. This change does
   not remove that secret or mutate any key records automatically.

On a rollout problem, pause affected Zaps or revoke their individual keys. Do not
restore unscoped global-key authentication as a fallback. Creation endpoints
remain non-idempotent: retries can create duplicate records within the same
organization; no new idempotency guarantee is claimed.

## Verification boundary

Isolated tests execute the real router and API-key/scope middleware with mocked
database, Redis and HubSpot adapters. They cover credential failures, scopes,
known foreign IDs and retries, spoofed ownership, customer relationships, both
key headers, quota/pagination, and scoped provider selection. A source-order
contract checks the early machine-router mount; it is not a full startup test.
No real database, Clerk session, Zapier account, or HubSpot API was exercised.
