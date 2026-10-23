# Customer-owned original-file archives

Implementation branch: `feat/customer-owned-storage`, based on `develop`.
This is an opt-in API and browser SDK integration. It has not been connected to
customer accounts, deployed, or used to migrate files. The existing scan UI does
not automatically enroll captures in this archive queue; a capture client must
explicitly enqueue the original Blob with the SDK below. No storage-settings UI
or Google Picker is included in this first implementation.

## Existing paths and the durability boundary

- `server/routes.ts` uploads dual-scan files to Replit object storage; failures
  fall back to `/tmp/dual-scans`. The session is committed separately.
- `server/dual-scan-storage.ts` persists both capture references and business
  results, with organization scope and revision checks.
- `server/dual-scan-content.ts` reads an existing object key or local path.
- `client/src/lib/offline-scan-queue.ts` queues measurement records and removes
  them after its upload callback succeeds. It is not an original-media archive.

These paths remain compatible. An archive is an additional customer-owned copy;
it does not silently replace a processing source, repair a missing local file,
change scan protocols, or certify that an old fallback is durable. The original
must still be available in the capture client to enqueue it. Existing files are
not read/moved/deleted by this change. Future server recovery can explicitly use
an authorized archive ID; processing does not yet automatically recover from it.

## Architecture and ownership

`StorageDestination` in `server/customer-storage/contracts.ts` is the reusable
provider interface (allocate stable identity, ensure folders, begin/resume
upload, inspect content, retrieve bytes). Google Drive is the initial concrete
implementation. No Replit sidecar credentials are used by this adapter.

| Location | Retained content |
| --- | --- |
| Existing application database | Customers, projects, openings, measurements, analyses, memberships, access rules, existing session references |
| Additive archive tables | Tenant/destination/file IDs, SHA-256, size, MIME, filename, state, offset, errors, verified time; encrypted OAuth tokens and resumable session URLs |
| Customer's Google Drive | Original scan, photo, video, supporting-document bytes and folder names; no exported application business-record database |
| Browser IndexedDB | Original Blob plus queue metadata until the customer copy is verified |

Files are organized under the connected root as:
`destination / organization / customer / project / opening / scan-session / archive-id_filename`.
Full IDs are encoded without lossy substitutions. A destination folder prevents
parallel destinations pointing to the same root from racing to create the same
hierarchy. Projects with no customer use `unassigned` explicitly. Filenames are
restricted to a single printable path component. Original binary formats are
preserved; Google-native document conversion MIME types are refused.

The API currently links archives to existing **dual-scan session IDs**. This
supports photos/videos/documents associated with those sessions as well as scan
files. Other capture protocols need their own session authorization adapter;
never convert their states or skip their ownership checks to reuse this API.

## Connection and security

An owner/admin starts Google consent with the narrow `drive.file` scope. Consent
uses random state and PKCE; state is encrypted, bound to local user and tenant,
expires after ten minutes, and is atomically consumed once. The callback requires
the same signed-in application user and management role. It does not trust an
organization ID returned in a URL. Local account IDs remain distinct from Clerk
provider subjects. OAuth callback query values are excluded from application
audit logs; configure any infrastructure access logs to redact queries too.

The default root is a `Door Survey Pro` folder created in the customer's Drive.
An optional root ID must already be accessible under `drive.file`, for example a
folder previously granted through Google Picker. Merely knowing a folder ID does
not grant access. This API validates folder type and write capability. A broad
Drive scope is not requested to work around missing Picker access. Picker UI,
account-selection UI, organization credential governance and live consent-app
verification remain deployment/integration work.

Credentials and resumable URLs use AES-256-GCM with authenticated tenant/resource
bindings and a dedicated 32-byte key. No plaintext-token fallback exists.
Preserve this key in secure deployment configuration across host replacements;
losing it requires customer reconnection and upload-session restart. Rotation
needs a reviewed decrypt/re-encrypt operation before replacing the key.
Credentials/session URLs are not returned in public archive responses. Provider
calls use fixed HTTPS origins, reject redirects, validate resumable URL origins
and paths, and have timeouts. Raw provider response bodies are not exposed.

All SQL record operations bind the organization. Composite destination references
prevent cross-tenant associations. Reads, transfers and retrieval recheck the
existing authorized project/opening/session chain; the customer folder comes from
the authorized project's customer ID. The server derives scope from existing
Clerk/local membership context. File operations use the same organization access
boundary as existing dual-scan uploads; destination management additionally
requires owner/admin. Client organization fields cannot override session scope.

Disconnect serializes with transfers, removes the local OAuth credential and
blocks further provider reads/uploads; it does not delete customer files or
archive references. This is a **local disconnect**, not Google-wide grant
revocation. Customers can revoke the app in their Google account independently.
Reconnect using the existing destination ID and the same Google account; the
server validates Google's account permission ID and keeps the original root.
Automatic grant revocation could affect other destinations under the same Google
account, so it is not performed implicitly.

## Transfer/recovery contract

The browser hashes the original with SHA-256 and reserves an archive record.
A pre-generated Google file ID is committed before any file upload is started.
A destination row lock serializes concurrent transfers/disconnects across hosts.
No file bytes are stored in the database or on a server-local spool.

Uploads use at most 8 MiB per API request, with 256 KiB alignment for nonfinal
chunks; the initial version caps originals at 200 MiB. Google resumable upload
status is authoritative. Stale/replayed offsets return current progress rather
than appending the chunk again. Checkpoints and provider errors are committed;
provider success followed by a lost DB commit is recovered via the stable file
ID or resumable status. Reservation uniqueness covers destination, customer,
project, opening, session, original filename and SHA-256; identical retries
return the same record. A changed checksum intentionally creates a new version.

Completion requires a separate authenticated download and SHA-256 of the actual
remote bytes, plus matching size. Custom checksum metadata is not accepted as
proof. Only `archived` with `verifiedAt` releases the browser Blob. Retrieval
streams privately through the authenticated server, without public sharing links.
An independently edited/deleted Drive file can later differ or become unavailable;
the stored checksum allows an explicit re-verification. The initial retrieval
endpoint does not re-hash the entire file before each download.

| Interruption | Behavior |
| --- | --- |
| Network/429/5xx | Retryable record; browser keeps bytes; retry same archive ID and ask provider for offset |
| Final response or metadata commit lost | Inspect existing stable provider file; verify, without creating a second file |
| Expired resumable session | Reset offset/session, inspect stable file first, then restart same provider ID |
| Google credential revoked/expired refresh grant | Disconnected error; original stays in browser; owner reconnects |
| Folder permission/quota issue | Explicit provider-permission-or-quota error; no false success |
| Checksum/size mismatch | `verification-failed`; retrieval denied; original retained; no automatic deletion/overwrite |
| Host filesystem lost | Archive/checkpoints remain in database and customer Drive; legacy `/tmp` loss remains explicit |
| Missing browser original before verified upload | Re-select/re-upload original; no claim of recovery from metadata |

Retry is caller-driven (`sync` again on a deliberate retry/online event), not an
unbounded background loop. The helper bounds stalled progress. It does not yet
provide timed exponential scheduling or a service-worker transfer. IndexedDB is
subject to browser eviction, private-mode and quota limits; queue writes must
succeed before showing “saved offline.” The 200 MiB hashing step buffers that
file in browser memory; use an incremental hashing worker before raising limits.
The row lock intentionally serializes a destination; scale to leased per-archive
workers plus a coordinated folder index if throughput requires parallel uploads.

## HTTP API

All routes are under `/api/customer-storage`. Existing cookie auth and CSRF
middleware apply; mutation requests need `x-csrf-token` through `apiRequest`.

| Method/path | Purpose |
| --- | --- |
| `GET /destinations` | Owner/admin lists sanitized destinations |
| `POST /google-drive/connect` | Owner/admin gets consent URL; optional `{rootId, destinationId}` for selected folder/reconnect |
| `GET /google-drive/callback?state=...&code=...` | Consume bound state, exchange consent, persist encrypted credential; returns sanitized destination JSON |
| `DELETE /destinations/:id` | Local disconnect, leaves customer files intact |
| `POST /destinations/:id/archives` | Reserve `{projectId, openingId, sessionId, filename, contentType, size, sha256}` |
| `GET /archives/:id` | Authorized status/reference, no secrets |
| `PUT /archives/:id/content?offset=N` | `application/octet-stream` chunk; empty body can probe/resume |
| `GET /archives/:id/content` | Authorized private retrieval of a verified archive |

`CustomerArchiveQueue` in `client/src/lib/customer-archive-queue.ts` is separate
from measurement sync. Instantiate in the browser, call `add({organizationId,
userId}, destinationId, {projectId, openingId, sessionId, filename, contentType},
originalBlob)` **before dropping the capture original**, and call `sync` using
the currently signed-in local user/tenant scope. Queue entries from another
account are not sent. The API remains authoritative for scope. Failed jobs retain
the Blob and stable archive ID through retries/reloads. Connecting this helper to
the existing capture screens and presenting destination/transfer status is a
subsequent UI integration; it must never equate measurement sync with archiving.

## Deployment and verification

1. Review only `migrations/0003_customer_storage.sql` against the target schema.
   Apply it through the approved additive migration process. Do not reset the
   database or force-push the full declared schema. No migration runs at startup.
2. Register a Google OAuth web client with the exact HTTPS callback URL and
   `drive.file` scope. Configure customer consent for the intended audience.
3. Supply `CUSTOMER_STORAGE_KEY`, `CUSTOMER_GOOGLE_CLIENT_ID`,
   `CUSTOMER_GOOGLE_CLIENT_SECRET`, `CUSTOMER_GOOGLE_REDIRECT_URI` securely. Set
   `CUSTOMER_STORAGE_ENABLED=true` only in the prepared test/deployment environment.
4. Run unit/contract checks and the separately guarded database suite against a
   disposable database with the additive tables already provisioned. Do not use
   production fixtures or credentials. Live Google consent, revocation, large-file
   failure recovery and organization membership changes need isolated validation.
5. Wire the capture UI/SDK, then explicitly validate originals survive host
   replacement before calling the feature deployed. Roll back by disabling the
   flag; keep the additive tables/customer files and references for recovery.

Focused safe command:
`node --require ./tests/setup/unit-env.cjs --import tsx --test server/__tests__/customer-storage.test.ts`.
Tests are registered in `tests/test-manifest.json` and run with `npm test`/CI.
The database fixture is registered only in the guarded integration group.
Provider behavior in unit tests is mocked, not evidence of a connected account.

## Additional providers: supported APIs versus assumptions

| Provider | Supported route | Implementation status / constraints |
| --- | --- | --- |
| Google Drive | OAuth `drive.file`, folder/files API, pre-generated IDs, resumable upload/status and authenticated media download | Implemented API adapter + browser queue; not live validated. Shared-drive flags are sent, but shared-drive tenancy/admin policies still require dedicated testing. |
| Dropbox | OAuth, upload-session start/append/finish, metadata, download; `content_hash` has a provider-specific block-hash algorithm | Evaluated, not implemented. Add scoped credentials, session cursor checkpoints and conflict-safe commit; verify Dropbox content hash or stream SHA-256. Do not treat `content_hash` as plain file SHA-256. |
| SharePoint | Microsoft Graph drive items and `createUploadSession` for a site's document-library drive | Evaluated, not implemented. Resolve tenant/site/drive/folder, use least-privilege selected-resource access and admin consent as required, resume `nextExpectedRanges`, enforce provider fragment rules, and protect preauthenticated upload URLs as secrets. |
| iCloud Drive | Native Apple document/file-picker and ubiquity-container workflows | No supported general-purpose server-side iCloud Drive REST upload destination was established. Do not invent one or request Apple passwords. Use native Files export/customer-chosen document provider; CloudKit is an app-container record/asset service, not interchangeable with arbitrary iCloud Drive folders. |

Official references reviewed 2026-10-23:

- [Google uploads, status/resume and safe retries with pre-generated IDs](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
- [Google create/manage files](https://developers.google.com/workspace/drive/api/guides/create-file)
- [Google Drive OAuth scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Dropbox upload-session API](https://docs.dropboxapi.com/dropbox-api/api-reference/user-endpoints/files/upload-session-start)
- [Dropbox content hash](https://docs.dropboxapi.com/dropbox-api/docs/technical-reference/content-hash)
- [Microsoft Graph upload sessions](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0)
- [Microsoft Graph selected permissions](https://learn.microsoft.com/en-us/graph/permissions-selected-overview)
- [Apple iCloud overview](https://developer.apple.com/icloud/)
- [Apple CloudKit](https://developer.apple.com/icloud/cloudkit/)

Cloud folder ACLs remain customer-managed and independent of application roles.
No public-sharing permission is created by this implementation. A customer who
chooses a shared folder controls who can see its contents directly in Drive.

## Verification observed for this branch

- Focused archive suite: 20/20 passed with network disabled and provider mocks.
- Structural doctor: passed. Production frontend/backend build: passed, with the
  existing bundle-size warnings.
- Full TypeScript check: 345 diagnostics, identical to the unchanged base commit
  `1d8f53ebeb324211513393279a02472c0e2b4eee` after normalizing checkout paths.
- Full unit suite: core contracts pass; existing UI Jest assertions (18) and
  landed-cost calculation assertions (18) fail on both base and task branches.
- PostgreSQL archive fixture: prepared but not run; no authorized disposable
  database was supplied. No migration was applied.
- Live Google, Dropbox, SharePoint and Apple account operations: not run. No
  production credentials/customer files were accessed. This is a draft for review,
  not a release certification.
