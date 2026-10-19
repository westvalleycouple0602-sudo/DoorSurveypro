# DoorSurvey Pro — Application Architecture and Function Guide

## 1. Purpose and scope

DoorSurvey Pro is a commercial-door surveying, estimating, hardware, and project-management application. Its source also includes customer service portals, sales and marketing tools, electronic-security assessments, company administration, and advanced capture/AI tools.

This guide is intended for the owner, designers, developers, and collaborators rebuilding or extending the application. It describes the code currently present, not an idealized replacement design.

**Evidence standard:** “Implemented in source” means a screen, handler, or service exists. It does not certify that a live integration is connected, every workflow passes end-to-end testing, every route is correctly authorized, or all declared database fields exist in the current database. No production records, secret values, or live account credentials were read to produce this document.

The generated full reference adds inventories of named application functions, HTTP route declarations, browser routes, table declarations, configuration-variable names, dependencies, and tests. Anonymous callbacks are not separately named in the function index; their enclosing function or HTTP handler provides the reference. Third-party dependency internals, archived copies, generated build output, and design-sandbox internals are outside the application-function inventory.

## 2. Architecture at a glance

The main application is a **TypeScript modular monolith**: one Express server hosts many business modules and serves a React single-page application. It is not a collection of independently deployed microservices.

```text
Browser / supported field-capture device
  |
  +-- React + Wouter pages and reusable components
  |     TanStack Query / React Hook Form / Zod
  |     Theme, translations, local/offline capture helpers
  |
  +-- Same-origin HTTP requests
        |
        Express application: server/index.ts
        Security / Clerk identity / operator sessions / request logging
          |
          +-- REST: legacy server/routes.ts + modular server/routes/*
          +-- GraphQL Yoga: /api/graphql
          |
          +-- Business services, calculators, compliance and capture engines
          +-- DatabaseStorage + some direct Drizzle queries
          |     |
          |     PostgreSQL via DATABASE_URL
          |
          +-- Object storage for uploaded files and media
          +-- Redis / BullMQ for supported caching and background work
          +-- NATS events and notification subscribers
          +-- External AI, email, CRM, accounting and signature services
```

The arrows represent code-level dependencies, not proof that each external service is connected in a particular environment.

## 3. Technology and repository map

| Area | Main technology / location | Responsibility |
| --- | --- | --- |
| Browser application | React 18, TypeScript, Vite; `client/src` | Pages, forms, navigation, visualizations and capture UI |
| UI system | Tailwind CSS, Radix-based components, Lucide icons | Shared controls, dialogs, tables, theme and accessibility primitives |
| Browser routing | Wouter; `client/src/App.tsx` | Lazy-loaded screens, public-route branches and authenticated shell |
| Server state | TanStack Query; `client/src/lib/queryClient.ts` | API queries, mutations, caching and invalidation |
| Forms and validation | React Hook Form, Zod; `shared/schemas` | Input handling and shared validation definitions |
| Server | Express; `server/index.ts` | Middleware, bootstrap, HTTP server, static serving and errors |
| REST API | `server/routes.ts`, `server/routes/index.ts`, `server/routes/*` | Business endpoints and module registration |
| Data access | Drizzle; `server/db.ts`, `server/storage.ts` | PostgreSQL connection, storage abstraction and query implementations |
| Shared domain model | `shared/schema.ts`, `shared/schemas/*`, `shared/types/*` | Tables, relations, insert schemas, types and domain contracts |
| GraphQL | GraphQL Yoga, DataLoader; `server/graphql` | Alternate query surface and request-local batching |
| Files | `server/objectStorage.ts` | Object upload/download access and storage configuration |
| Documents | PDFKit, ExcelJS, spreadsheet/CSV libraries | Reports, quotes, schedules, imports and exports |
| Async work | BullMQ, Redis, NATS; `server/jobs`, `server/events`, `server/utils` | Background processing, notifications, event distribution and caching |
| Observability | Sentry, Winston, PostHog, project analytics helpers | Error reporting, logs, browser events and performance instrumentation |
| Design-only workspace | `artifacts/mockup-sandbox` | Separate component preview environment; not the main production server |
| Operations | `scripts`, migration/config files, CI workflow | Builds, dependency checks, migrations, backups and developer utilities |

The source combines a newer modular route registry with a large legacy route file and a large storage class. Some business logic lives directly in handlers or direct database queries rather than behind a uniform service layer. A redesign should account for both paths.

## 4. Startup and request lifecycle

1. `server/index.ts` imports server instrumentation, loads environment configuration, and validates startup settings.
2. Express installs the Clerk proxy and early health routes, then security middleware and special webhook handling.
3. JSON/form parsing, Clerk middleware, local-user resolution, the separate operator session, compression, performance tracking and audit logging are installed.
4. Notification subscribers and the trial reminder scheduler are initialized. Development-mode startup may create/update a development organization; this is a real side effect.
5. `registerRoutes` installs CSRF handling and the legacy endpoints. The modular registry adds business routers and seeds some reference/application content when needed.
6. GraphQL is mounted alongside REST. Error handlers and Vite development serving or built static serving complete the HTTP application.
7. Requests pass through applicable authentication, organization, permission, validation, feature-gate and rate-limit checks before a handler calls storage/services.
8. Responses generally return JSON; document routes return files, chat can stream, and uploads use file-processing paths.

**Ordering matters.** DocuSign raw-body capture precedes ordinary JSON parsing so signature verification can use the original payload. The operator session is scoped to `/api/super-admin`. Early webhook retirement behavior and health routes do not follow exactly the same middleware path as ordinary API requests.

## 5. Identity, organizations and permissions

### Main application accounts

Clerk supplies the main application's identity layer. `server/clerkAuth.ts` resolves the signed-in identity into a local application user and exposes authentication and organization-context helpers.

`server/clerk-account-binding.ts` preserves the relationship between Clerk identities and existing local accounts. **A local user ID is not necessarily the Clerk subject.** Existing project ownership, memberships, customer relationships and other foreign-key links must not be broken by assigning a replacement identity ID.

### Roles and organization boundaries

The declared role hierarchy includes owner, admin, PM manager, manager, project manager, engineer, sales representative, procurement officer, technician and viewer. `shared/permissions.ts` contains feature permissions and URL-to-permission mapping. Server middleware contains role and organization-access checks.

These are application-level organizations and memberships stored in PostgreSQL. Their existence should not be confused with identity-provider organization configuration.

**Navigation is not an authorization boundary.** Hiding a sidebar item does not secure the corresponding API. Each sensitive read/write still needs the correct server-side identity, organization and role checks.

### Other access modes

| Access mode | Intended use | Relevant source |
| --- | --- | --- |
| Clerk application sign-in | Internal company/team application | `server/clerkAuth.ts`, `client/src/components/clerk-provider.tsx` |
| Operator / super-admin credentials | Separate platform-wide administration console | `server/routes/super-admin.routes.ts`, operator middleware in `server/index.ts` |
| Portal links and client portal | Customer-facing project/quote access and service requests | `server/routes/portal-shares.routes.ts`, `server/routes/portal.routes.ts` |
| API keys | Versioned programmatic API access | `server/routes/api-keys.routes.ts`, `server/routes/api-v1.routes.ts` |
| Incoming webhooks | External service callbacks | `server/routes/webhooks/*`, `server/index.ts` |

These are distinct mechanisms. A successful Clerk sign-in should not be assumed to establish an operator session or customer-portal authorization.

## 6. Data architecture

`server/db.ts` creates a PostgreSQL pool using the Neon serverless driver and **`DATABASE_URL`**. The driver choice does not by itself identify which external account owns the live database. A differently named connection secret does not automatically replace the variable used by this module.

`DatabaseStorage` implements `IStorage` in `server/storage.ts`. It is the main application data-access abstraction, but some services and routes also use Drizzle directly.

| Data family | Main concepts |
| --- | --- |
| Identity and tenancy | Organizations, users, memberships, invitations, roles and account links |
| Customers | Customer organizations/contacts, locations and product/service history |
| Projects and surveys | Projects, door openings, survey responses, specifications, photos and related records |
| Catalog and hardware | Products, manufacturers, distributors, bundles, categories, cross-references and hardware mappings |
| Estimation and purchasing | Costs, quote requests, vendor quotes, purchase orders, line items, change orders and pricing alternatives |
| Engineering and compliance | Compliance findings/rules, review records, drawings, floor plans, keying and wiring data |
| Delivery and collaboration | Quotes, deliveries, approvals, versions, comments, activities, portal shares and service requests |
| Business operations | Sales, procurement, project tasks/milestones, HR onboarding, job titles and integrations |
| Marketing and notifications | Blog/resources, campaigns, email templates, notification and tracking records |

The generated table appendix is the exact **source declaration** inventory, including column names and locations. It is not a database dump or a claim that all declared tables exist in production.

**Known compatibility constraint:** the existing database predates portions of the modular schema and has previously differed from declarations. Inspect the target schema before migrations. A forced schema push is not a safe substitute for a reviewed compatibility migration.

Object storage is separate from PostgreSQL. A database record referring to a photo or document does not contain the corresponding stored object. A complete preservation plan must treat database data, object-storage content, application source and secrets as separate assets.

## 7. Functional catalog — core business application

| Function area | What the application code provides | Main source entry points |
| --- | --- | --- |
| Dashboard and navigation | Project/business summaries, recent work, global search, quick actions, guided onboarding and help | `client/src/App.tsx`, `server/routes/dashboard.analytics.ts`, `server/routes/search.routes.ts` |
| Projects | Create, view, update and duplicate projects; associate customers, location information and project configuration | `server/routes/projects.routes.ts`, legacy routes, storage |
| Door openings | Capture door/frame dimensions, handing, ratings, hardware and opening-specific details; attach survey information and photos | `server/routes.ts`, `shared/schemas/projects.schema.ts` |
| Guided door surveys | Multi-step survey workflows, answers and related opening information | `server/routes/door-surveys.routes.ts`, `shared/workflows/doorSurveyWorkflow.json` |
| Customers and locations | Maintain customer records, locations and history associated with commercial work | Legacy routes and `server/storage.ts` |
| Product and hardware catalog | Browse/search hardware, product details, taxonomy and manufacturer-related catalog information | `server/routes/hardware-catalog.routes.ts`, `server/routes/taxonomy.routes.ts` |
| Manufacturers and distributors | Maintain source/vendor directories, product/contact information and purchasing relationships | Manufacturer and distributor route modules |
| Hardware bundles and templates | Reuse combinations of hardware and door/project templates to reduce repeated specification work | Legacy routes, storage, shared hardware mappings |
| Cross-reference and lock data | Alternative product references, lock-product taxonomy, manufacturer/market information and supporting assets | Legacy cross-reference endpoints, `server/routes/lock-data.routes.ts` |
| Hardware label scanning | Decode hardware label images, extract/normalize product tokens and track scans/usage | `server/hardware-scanner.ts`, scan endpoints and scanner components |
| Cost estimation | Calculate material, labor, installation and freight components and aggregate project estimates | `server/calculators/*`, `server/estimators/ProjectEstimator.ts`, `shared/calculators.ts` |
| Bill of materials | Generate material requirements from opening/hardware configurations and templates | `server/services/bom-generator.ts`, BOM endpoints |
| Pricing alternatives | Good/better/best or other quote alternatives; pricing/discount and partner-pricing helpers | `server/routes/projectAlternatives.ts`, partner-pricing modules, shared pricing helpers |
| Vendor quotes and purchase orders | Record supplier quotes, purchase orders and individual line items | Legacy routes, storage |
| Change orders | Track changes to project scope and related financial information | `server/routes/change-orders.routes.ts` |
| Hardware schedules | Produce opening/hardware schedules and schedule exports | `server/hardware-schedule-export.ts`, related routes |
| Quote generation and export | Create project documents and branded exports, with configurable profiles and selected content | `server/pdf-generator.ts`, `server/routes/export.ts`, export profile/branding modules |
| Quote delivery and responses | Create/send customer quotes and record customer-facing delivery/confirmation interactions | `server/routes/quote-delivery.routes.ts` |
| Versioning | Keep versions of quote and project-related content rather than treating every export as an untracked overwrite | `server/routes/versioning.routes.ts` |

## 8. Functional catalog — field capture and engineering

| Function area | What is present | Dependencies / cautions |
| --- | --- | --- |
| Photo analysis | AI-assisted interpretation of door/hardware photos and measurement review helpers | AI service and media access must be available; human review is still required |
| LiDAR and point-cloud processing | Import/parse scan formats, process point clouds, compare closed/open door captures and produce analysis data | `server/lidar-processor.ts`; input quality and compatible capture hardware matter |
| Dual-scan workflow | Closed-door and open-door scan sessions with analysis and generated drawing results | Session metadata is now persisted through `server/dual-scan-storage.ts`; a missing host-local capture file still cannot be recreated from metadata |
| AR measurement helpers | AR/WebXR capture/measurement interfaces and browser-side adapters | Requires compatible browser/device capabilities; not a universal hardware replacement |
| Offline scan queue | Browser-side storage/queue helpers for captured scan work | `client/src/lib/offline-scan-queue.ts`; device-local state is not a substitute for a server backup |
| Calibration and learning | Measurement/calibration corrections and supporting engine functions | `server/engine/*`, calibration routes; validate behavior against real capture data |
| CAD/drawing generation | Door elevations/drawing sets, overlays and DXF export | `server/drawing-generator.ts`, shared CAD types/utilities |
| Floor plans | Floor-plan assets, opening/door positioning and project visualizations | File storage and opening associations must be preserved together |
| Compliance checks | Door/hardware rules, jurisdiction-specific standards, findings, resolution/waiver flows and validation | Compliance modules and jurisdiction data; not a replacement for professional/code-authority review |
| AI compliance assistance | Explain findings or assist review of scan/door information | AI output is advisory, not a guarantee of legal or technical compliance |
| Engineering review | Review-oriented screens and add-on access gates | Availability depends on plan/add-on and permission configuration |
| Keying and key records | Individual key tracking plus master-key-system structures and assignments | Separate key-record and master-keying modules |
| Gasketing, disclaimers and wiring | Specification/reference records and specialist engineering support screens | Verify actual catalogs/reference values before using in a project |
| Division 28 assessments | Electronic-security assessments, opportunity scoring, proposal support and PM-task helpers | `server/routes/div28.routes.ts`, `server/div28/*`, shared Division 28 types |

## 9. Functional catalog — company operations and collaboration

| Function area | Purpose / behavior | Main source |
| --- | --- | --- |
| Sales and milestones | Sales tracking, assignment/status views and milestone workflows | Sales routes, legacy project management routes |
| PM board and tasks | Project task templates, project-management board/status handling and task management | `server/routes/pm-tasks.routes.ts`, `shared/projectManagement/*` |
| Procurement | Procurement packages, manufacturer order forms and order preparation support | `server/routes/procurement.routes.ts`, shared procurement/order-form engines |
| Project issues, assignments and milestones | Track execution responsibilities, issues and project progress | Legacy routes, shared PM types, storage |
| Scheduling and service queue | Schedule-oriented and service-request management interfaces | Client pages, portal routes and operational endpoints |
| Client portal | Customer sign-in/link access, requests, customer-facing projects/quotes, reports and scheduling interactions | `client/src/pages/client-portal/*`, portal route modules |
| Project sharing | Token-based share links for selected customer/project views | `server/routes/portal-shares.routes.ts` |
| Comments and activities | Project conversations, mentions and activity/audit-style feeds | Comments and activities route modules |
| Notifications | Event-driven email notifications, templates and queue-backed delivery | `server/events`, `server/jobs`, `server/email-service.ts`, email templates |
| Team and invitations | Team members, invitation consumption, role management and organization membership | Team routes, `server/invitation-consumption.ts`, auth/storage |
| HR onboarding | Reusable onboarding plans, employee steps and related company processes | HR onboarding routes |
| Corporate job titles | Role/job-title catalog and related assignments | Job-title routes and seed data |
| Branding and profiles | Company/profile settings, brand assets and export-branding onboarding | Branding and export-branding modules |
| Plans, usage and trials | Feature availability, project/user/scan limits, trial eligibility, grace/expiry policy and reminders | `shared/subscriptions.ts`, feature gates, trial service/policy/scheduler |
| Administration | Organization administration plus a separate platform-wide operator console | System-admin and super-admin modules |

Plan definitions include Free, Starter/Solo, Professional/Team, Enterprise/Integration, an internal Master tier and legacy Pro compatibility. Tier definitions and trial policy are separate: the current trial policy defines Professional and Enterprise trial lengths independently. Consult the policy rather than assuming a single global trial-duration constant governs every case.

## 10. Functional catalog — analytics, marketing, AI and imports

| Function area | Purpose / behavior | Main source |
| --- | --- | --- |
| Analytics and reporting | Dashboard, business/project reports, quote analytics, revenue assessment and performance views | Analytics, reporting, quote-analytics, performance and revenue-assessment modules |
| Competitive and marketing analysis | Competitive positioning and marketing-oriented reports/workflows | Competitive and marketing modules |
| Website/content management | Landing/resource/case-study/blog-related content, testimonials and prelaunch/lead handling | App route branches, blog/testimonial/marketing/prelaunch modules |
| Browser analytics | Page views, user context, project-event helpers and performance/error instrumentation | `client/src/lib/posthog.ts`, `project-analytics.ts`, `rum.ts` |
| AI chat | Server-side AI chat assistance, including streaming-related handling | `server/routes/chat.routes.ts`, AI/RAG modules |
| Retrieval/reference assistance | Search/retrieve contextual reference information for AI assistance | `server/rag-service.ts`, `server/rag/*` |
| SQL assistant | Natural-language/query assistant path with parser/validation and organization-aware query protections in source | `server/routes/sql-assistant.routes.ts`, associated services; review as a sensitive data boundary |
| Computer vision and document intelligence | Image/document processing and analysis interfaces | Corresponding route and service modules; provider/service setup is required where used |
| Bulk project/product imports | Import structured project/product information, CSV/spreadsheet data and catalog content | Bulk-import, product-bulk-import and legacy import modules |
| PDF catalog import | Catalog extraction/import workflows from PDF/reference documents | PDF catalog routes and processing services |
| Export profiles | Reusable document/quote export configuration and branding | Export profile, export branding and branding-onboarding modules |
| Public API and webhooks | API-key management, versioned external API and incoming/outgoing integration hooks | API-key, API-v1 and webhook modules |
| Help, onboarding and feedback | Guided tours, feature guides, getting-started screens and bug reports | Client pages/components and related endpoints |

For exact handler names and locations, use the generated route and function appendices rather than assuming every action is implemented in its similarly named page file.

## 11. External services and current implementation boundaries

| Service / subsystem | Source responsibility | What must not be assumed |
| --- | --- | --- |
| Clerk | Identity, session resolution, local-account linking | A provider identity ID can replace every legacy application user ID |
| PostgreSQL | Durable relational application records | Source declarations exactly match the existing live schema |
| Object storage | Uploaded media/documents and object access | A source-code copy or database copy also transfers stored file bytes |
| AI provider / OpenAI client | Photo/chat/reference/document assistance where called | Installed SDKs prove live credentials, model access or reliable output |
| Resend / email | Transactional emails and email callback processing | Template presence proves successful delivery or sender-domain setup |
| HubSpot | CRM configuration, synchronization and monitoring | Every object type supports retry; some retry cases explicitly remain unimplemented |
| QuickBooks | Accounting OAuth/client/export integration code | Exported line-item values are always final; some export construction uses zero-value placeholders requiring review |
| DocuSign | Signature OAuth/client code and verified webhook processing path | A callback URL, credentials and HMAC configuration have already been reconnected in a new environment |
| Redis / BullMQ | Shared cache and durable-capable queue backend | In-memory fallback has the same durability or multi-instance behavior |
| NATS | Notification/event distribution | The in-memory fallback delivers events to independent worker processes |
| Sentry / PostHog | Error/performance and product analytics | Code instrumentation proves an external project is configured or collecting events |
| Other integration settings | Google/Microsoft/Zapier-related configuration and connection/linking code | A settings screen or stored connection record means the complete provider workflow is enabled |

### Online billing: important current behavior

The current implementation **returns HTTP 410 for retired online payment actions**. This includes subscription checkout/portal creation and Stripe webhook paths; the quote-payment page also states that online quote payments were removed. Plan definitions, usage, role/feature gates and trial logic still exist.

Sources include `server/index.ts`, `server/routes/subscriptions.routes.ts`, `client/src/pages/billing.tsx` and `client/src/pages/quote-payment.tsx`. Historic subscription data can remain even when checkout is unavailable. This documentation does not cancel any external subscription, remove Stripe, alter credentials, or restore payment behavior.

### Explicit incomplete or limited areas found in source

- GraphQL includes a placeholder for future mutations; do not describe it as a complete replacement for the REST write API.
- The health metrics endpoint is marked as a stub for future Prometheus integration.
- A notification-service database-fetch path is marked as a stub.
- Some reference seed values explicitly require verification.
- LiDAR mapping contains an approach-direction assumption awaiting derivation from capture/orientation.
- Some HubSpot object retry types are not implemented.
- Some QuickBooks export pricing fields are placeholders requiring review.
- Dual-scan session metadata is now persisted, but referenced host-local fallback files can still be lost on host replacement. Queue/event fallbacks are not durable equivalents of their external services.

These are specific source observations, not a blanket claim that all advanced functionality is simulated or that the whole application is complete.

## 12. Main end-to-end workflows

### A. Survey to proposal

Sign in → establish local user/organization → create customer/project → create openings → capture specifications/photos/scans → review measurements and compliance → choose hardware/bundles → estimate material/labor/freight → generate BOM/schedule/quote → export branded documents → deliver quote → track response and version history.

### B. Approved work to procurement and delivery

Project/quote scope → PM task templates and assignments → procurement package/manufacturer order information → vendor quotes/purchase orders → milestones/issues/change orders → updated documents and operational reporting.

### C. Customer service

Portal access/link verification → customer project/request/quote view → service request or scheduling interaction → internal service/operations queue → activity/comment/notification trail.

### D. Team onboarding

Organization configuration → role/permission assignment → invitation/acceptance → membership creation/linking → HR/job-title onboarding steps → appropriate application views and feature gates.

### E. Notifications

Business action → publish event → notification subscriber selects recipients/template → queue/email service → provider delivery → callback/status handling where implemented. Missing external services may change behavior to local fallback or failed delivery; inspect the relevant module rather than assuming success.

## 13. Reliability, security and operational boundaries

- The source installs Helmet/security middleware, rate limiting, input handling, CSRF checks, audit logging and role/organization guards. This is an architectural description, not a security certification.
- Some routes have special authentication or CSRF exemptions. New webhook/public routes must be deliberately placed and authenticated by their appropriate mechanism.
- File uploads can be large and may involve asynchronous processing. Protect both temporary upload handling and final object ownership/access.
- SQL assistance, AI tooling, API keys, operator access and external webhooks are sensitive boundaries that deserve targeted authorization and abuse testing.
- Redis-based caching, job queues and rate-limit helpers have different configuration and fallback paths. `REDIS_HOST` settings used by one subsystem do not prove a `REDIS_URL`-only subsystem is connected.
- In-memory fallbacks lose state on restart and do not automatically coordinate across multiple server instances.
- NATS fallback explicitly does not provide delivery to separate worker processes.
- Sentry and browser monitoring are initialized in source; actual configured collection was not verified.
- The browser analytics path can identify users with profile and organization attributes when enabled. Review consent, data minimization and retention before enabling or redesigning analytics.
- The current repository contains dependency remediation and audit tooling. This document is not a new vulnerability scan and does not assert that all future dependency versions remain safe.

## 14. Development, build and testing

| Command / location | Meaning |
| --- | --- |
| `npm run dev` | Starts the TypeScript Express development entry point; Vite is integrated with development serving |
| `npm run build` | Builds the Vite frontend and bundles the server entry into `dist` with esbuild |
| `npm start` | Runs the built production server |
| `npm run check` | Runs TypeScript checking |
| `npm run db:push` | Applies declared Drizzle schema changes; review database compatibility before using |
| `server/__tests__`, client tests, Jest configuration | Existing unit/integration test sources |
| Playwright configuration and test scripts | Existing browser-testing tooling |
| `scripts/check-*`, `scripts/audit-dependencies.py`, CI | Operational and dependency-validation helpers |
| `scripts/backup/*` | Source/history backup, restore and GitHub-ready-copy utilities |

The generated test appendix identifies test source files. Test presence does not mean the suite was run or passed during documentation generation. No application deployment, migration, payment action, or live user workflow was executed for this documentation request.

The configuration appendix lists **variable names only**. Frontend `VITE_` configuration is browser-visible and must not contain private server credentials. Restore needed configuration through the destination workspace's supported secret/configuration mechanisms rather than placing secret values in documentation or source archives.

## 15. Collaboration, transfer and rebuild checklist

1. Preserve the original application and full-history backups before redesigning.
2. Keep the GitHub backup private. Do not mix the original oversized-catalog history into a cleaned upload branch.
3. Source-only transfers are not full-environment backups. Preserve database data, object files and required external-service configuration separately.
4. The oversized original catalog is a separately preserved asset, not a file to silently delete from the original project.
5. Preserve local-user IDs, identity-provider bindings, memberships, organization ownership and foreign-key relationships.
6. Compare the destination database schema before migration. Never assume the declared schema can safely overwrite the legacy structure.
7. Reconnect services intentionally; keep test/production identities, callbacks, credentials and data environments distinct.
8. Reconfirm billing behavior explicitly. Existing plan metadata and retained payment-related configuration do not imply checkout is active.
9. Prioritize the survey → estimate → quote → customer-response workflow when deciding what the redesign must retain.
10. Revalidate scan quality, compliance results and external exports with real representative data.
11. Use new components/modules as a presentation redesign without accidentally replacing critical legacy handlers/storage behavior.
12. Treat this guide as a source snapshot. Regenerate the inventories after meaningful changes.

## 16. How to navigate the full technical reference

The generated reference below is designed to answer:

- “Which screen or route owns this feature?”
- “Where is this API handler declared, and what router prefix applies?”
- “Which source table defines these fields?”
- “Where is this function or class method implemented?”
- “Which configuration variables and external packages does the code reference?”
- “Which tests already exist for this area?”

Use source-file paths and line numbers as navigation aids for this snapshot. Some route declarations overlap or use dynamic registration. Their presence/order/guards must be inspected before making a routing or authorization change.
