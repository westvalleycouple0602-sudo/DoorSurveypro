# DoorSurvey Pro - Multi-Tenant SaaS Platform

## Overview
DoorSurvey Pro is an enterprise-grade multi-tenant SaaS platform for the commercial door industry. Its purpose is to automate and streamline door surveys, estimations, and project workflows through intelligent automation, AR-powered measurements, and real-time building code compliance validation. The platform aims to provide intelligent project management, AI-powered photo analysis, a modular estimation system, a comprehensive hardware catalog, interactive floor plan visualization, integrated dashboard analytics, and comprehensive quote export & versioning. The business vision is to revolutionize the commercial door industry by significantly reducing survey times, minimizing errors, and accelerating quote turnaround, thereby enhancing efficiency and profitability for businesses.

## User Preferences
I prefer clear, concise communication and detailed explanations when necessary. I value an iterative development approach and want to be involved in major architectural decisions. When making changes, please prioritize robust solutions and maintain the existing project structure. Avoid making changes to the `shared/schema.ts` file without explicit discussion.

## Source control workflow

The shared repository is `westvalleycouple0602-sudo/DoorSurveypro`. Use `develop`
as the integration base and a separate short task branch for each change. Follow
`docs/GIT_WORKFLOW.md` for the clean-history handoff, `work:start` / `work:push`
helpers, PR targets, known failing checks, and release steps. Preserve unpushed
workspace changes before switching. A GitHub push is separate from publishing.

## System Architecture

### UI/UX Decisions
The platform utilizes Shadcn UI with Radix primitives, the Inter font, a professional blue color palette, and Lucide React. It features a mobile-first, responsive design with an 8-section sidebar for navigation. Key UI components include a 9-step Professional Scan Interface and a searchable Hardware Catalog. UX patterns incorporate skeleton loading, error feedback, toast notifications, dark/light mode, multi-language switching, responsive tables, real-time Zod form validation, and optimistic updates. A Branding Onboarding Wizard guides new organizations through setup, including intelligent logo import and color palette extraction.

### Technical Implementations
Built with React, TypeScript, Express, and PostgreSQL, the platform employs a multi-tenant architecture with tenant isolation. It includes real-time building code validation, a comprehensive door, frame, and hardware database, and an estimation system. The Product Data Model supports manufacturers, product families, SKUs, variants, certifications, pricing tiers, and compatibility rules, extended by a Hierarchical Taxonomy System and a Lock Product & Manufacturer Intelligence System.

Key features include:
- A Professional Scan SDK with a 9-step guided workflow and offline support.
- An AI-powered chat assistant.
- A secure bulk CSV import system.
- RAG-enhanced compliance validation with `pgvector` and OpenAI embeddings.
- Interactive floor plan visualization (FloorPlanViewer component connected to floor-plans page with clickable opening markers), file attachment management with S3/R2 storage, and reusable hardware sets.
- Audit logging and comprehensive dashboard analytics with Redis caching.
- A production-ready webhook delivery system with HMAC-SHA256 signatures and retry logic.
- An event-driven worker architecture utilizing NATS for async processing.
- A comprehensive email notification system integrating React-based templates, BullMQ queuing, and Resend, handling 37 event types.
- A HubSpot Sync Link Tracking system for bidirectional synchronization.
- A comprehensive Building Code Compliance System providing automated door hardware validation with 95 rules across Division 8 and Division 28 specifications, supporting various requirement types and enterprise features like jurisdiction overlay and remediation guidance. This is augmented by a Hybrid AI Compliance System combining a deterministic rule engine with an AI layer and a RAG Query Module.
- A Door Survey Wizard provides an 11-step multi-step form for capturing commercial door opening data, supporting DIV28 Electronic Security Devices.
- A LiDAR Integration System enables automated door compliance validation from mobile device scans with a three-layer architecture, featuring 3D model storage (GLTF/USDZ/OBJ), wireframe interpretation (SVG/JSON/GLTF), triple-scan enforcement (door-open both sides, door-closed side A, door-closed side B), scan photo capture with multi-type support (reference/detail/hardware/panorama-segment) and stitching groups, and a tabbed 3D model/wireframe/preview viewer.
- A Quote Export & Versioning System offers configurable export templates, multi-format output, project alternatives, custom branding, and an Entity Versioning System with deep diff computation and one-click restore.
- A multi-tier subscription system enforces usage limits, with automated email notifications and Stripe integration.
- A Beta Tester Invitation System provides private beta access with single-use tokens.
- A Quick Employee Invite System enables rapid onboarding with email invitations, role assignment, and a status dashboard.
- A Role-Based Email Templates System provides 35+ pre-built email templates across 14 categories with role-based visibility, variable substitution, and HubSpot integration.
- A Comprehensive Scheduling System offers a unified dashboard for Site Walks, Measurements Verification, Installations, and Warranty Repairs, featuring a three-panel layout, drag-and-drop rescheduling, trade coordination features, and integration with Google Calendar and Microsoft 365.
- A Quote Delivery & Confirmation System enables multi-channel quote delivery with interactive customer approval workflows, configurable option groups, signature capture, and DocuSign integration.
- A Photo Annotation System provides element highlighting (door/frame/hardware) with color-coded status indicators (untouched/reinstalled/replaced/integrated), callout boxes with hardware item linking, auto-population from opening data, and annotated photo export with scope-of-work summaries and PNG download.
- A Factory Order Form provides a comprehensive multi-section measurement capture form with auto-population from opening data, covering project info, frame specs (type, dimensions, rough opening, soffit/throat/jamb depth, gauge, coating, hinge type), active/inactive door specs (dimensions, fire rating, glazing cutout, core, species, finish), hardware dimensions A–R (hinge positions, lock stile, door prep, flush/fire bolt positions, strike location), lockset/deadbolt details, handing, finish/protection (kickplate, astragal, threshold, sweeps). Generates SVG technical drawings: combined door+frame drawing when same manufacturer, or separate labeled drawings when different manufacturers, with SVG download per drawing.
- Project management with Kanban-style task boards, procurement red-flag system, and Division 28 opportunity engine.
- Automated jurisdiction and AHJ lookup for building codes.
- Advanced LiDAR scan analysis including fiducial marker calibration, hardware placement measurement, enhanced hinge analysis, locking hardware detection, access control component detection, dual-scan reveal & gap analysis, material identification (frame/door material, installation method, veneer/finish, color), accessory detection (vision kits, louvers, moulding, weatherstripping, smoke seals, thresholds), enhanced reveal details (frame profile, stop type, glazing bead, perimeter seal), and condition assessment with compliance gap analysis (NFPA 80/IBC/ADA) and upgrade recommendations.

### System Design Choices
-   **Database**: PostgreSQL with Drizzle ORM on Neon serverless.
-   **Authentication**: Replit-managed Clerk handles sign-in, sign-up, password recovery, verification, and browser sessions. Its provisioning supplies custom `userId`, email, username and name session claims; missing managed claims fail explicitly instead of creating parallel accounts. Cookie-only API authentication preserves the existing local ID/email/username account bridge, organization memberships, roles, and permissions. First-time account linking validates the native provider subject and verified primary email, then stores a stable relationship in the existing `linkedProviders` app field; subsequent basic identity reads use session claims without Clerk API lookups. Local identity columns and legacy session tables remain declared but Clerk is the identity source of truth.
-   **Security**: Enterprise-grade HTTP Security Headers, Input Sanitization (Zod), Rate Limiting, Multi-Tenant Isolation, CSRF Protection, and Session Security.
-   **Logging & Observability**: Winston-based logging, health checks, RUM, Infrastructure Health monitoring, and Sentry integration.
-   **Error Handling**: Global React ErrorBoundary and Express error middleware.
-   **Frontend State Management**: TanStack Query.
-   **Form Handling**: React Hook Form with Zod.
-   **Session Management**: Clerk browser sessions; local users and sessions schemas are preserved for existing application data.
-   **Caching**: Redis-based distributed cache.
-   **Background Jobs**: BullMQ job queue with Redis backend.
-   **Testing**: Playwright E2E tests and Jest unit tests.
-   **CI/CD**: GitHub Actions pipeline.

## External Dependencies

### Core Infrastructure
*   PostgreSQL
*   Redis
*   BullMQ
*   NATS

### AI & Analysis
*   OpenAI
*   pgvector
*   Tesseract.js

### Hardware & AR
*   @zxing/library
*   @react-three/fiber, @react-three/xr, @react-three/drei

### UI & Frontend
*   Shadcn UI & Radix UI
*   Wouter
*   TanStack Query
*   React Hook Form + Zod
*   react-i18next

### Backend & API
*   Express
*   Drizzle ORM
*   GraphQL Yoga
*   DataLoader

### Document Generation & Processing
*   ExcelJS
*   PDFKit
*   Multer
*   csv-parse
*   Jimp

### Third-Party Services
*   Stripe
*   Resend API
*   HubSpot CRM & Marketing API
*   DocuSign
*   Google Calendar
*   Microsoft 365 (Outlook)

### Security & Monitoring
*   helmet
*   express-mongo-sanitize
*   csurf & cookie-parser
*   express-rate-limit
*   Winston
*   web-vitals
*   Sentry
