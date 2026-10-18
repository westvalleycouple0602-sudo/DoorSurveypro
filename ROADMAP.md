# DoorSurvey Pro - Product Roadmap
**Last Updated:** February 7, 2026
**Planning Horizon:** 12 months (Q1 2026 - Q1 2027)

---

## Overview

This roadmap outlines the planned evolution of DoorSurvey Pro from its current production-ready state to a market-leading commercial door industry platform. The plan is organized into four quarterly phases, each building on the previous to deliver incremental customer value while expanding the platform's competitive moat.

---

## Current State Summary

### Completed Capabilities
- 113-page multi-tenant SaaS application with 73 API route modules
- Triple-scan LiDAR enforcement (open both sides, closed Side A, closed Side B)
- 11-step Door Survey Wizard with DIV28 Electronic Security support
- 95-rule building code compliance engine (NFPA 80, IBC, ADA)
- AI-powered chat assistant, photo analysis, and RAG compliance queries
- Kanban PM board with procurement red-flag system
- Hardware catalog with manufacturer intelligence and cross-reference
- Master keying system management
- Multi-tier Stripe subscription billing
- Quote export with versioning, deep diff, and one-click restore
- Comprehensive scheduling with calendar integrations
- HubSpot CRM bidirectional sync
- Email notification system (37 event types, 35+ templates)
- Branding onboarding wizard with logo import and color extraction
- Enterprise security: RBAC, 2FA, CSRF, rate limiting, audit logging

---

## Q1 2026: Launch & Stabilization

**Theme:** Production hardening, customer onboarding, feedback loop

### Goals
- Successfully onboard first 50 paying customers
- Achieve 99.9% uptime SLA
- Gather structured product feedback for prioritization

### Initiatives

#### 1.1 Production Monitoring & Alerting
- Configure Sentry alerting thresholds for error rate spikes
- Set up uptime monitoring with automated incident response
- Implement database query performance tracking
- Create operations runbook for common issues

#### 1.2 Onboarding Optimization
- A/B test branding onboarding wizard flow
- Add interactive product tour for first-time users
- Create "Quick Start" template projects with sample data
- Implement in-app feedback collection (NPS, feature requests)

#### 1.3 Performance Optimization
- Optimize critical query paths with EXPLAIN ANALYZE
- Implement frontend code splitting for faster initial load
- Add CDN for static assets in production
- Target: < 2s Time to Interactive, < 100ms API p95 latency

#### 1.4 Mobile Experience
- Optimize responsive layouts for tablet field use
- Improve LiDAR scan upload flow on mobile networks
- Add offline-capable survey data entry with sync
- Progressive Web App (PWA) manifest and service worker

---

## Q2 2026: Feature Depth & Integration

**Theme:** Deepen core workflows, expand third-party integrations

### Goals
- Reach 150 paying customers
- Launch integration marketplace
- Reduce average survey time by 30%

### Initiatives

#### 2.1 Advanced LiDAR Processing
- Automatic point cloud to floor plan conversion
- Multi-opening batch scan processing
- Scan quality scoring with retake recommendations
- Historical scan comparison for renovation projects

#### 2.2 Estimation Engine Enhancements
- Real-time pricing from distributor APIs
- Labor cost estimation based on opening complexity
- Material waste factor calculations
- Automatic value engineering suggestions

#### 2.3 Integration Marketplace
- Procore integration for general contractor workflows
- Bluebeam Revu integration for plan markup
- QuickBooks/Xero integration for invoicing
- Salesforce CRM alternative to HubSpot

#### 2.4 Reporting & Analytics
- Custom report builder with drag-and-drop
- Automated weekly project summary emails
- Profitability analysis per project/customer
- Team productivity benchmarking

---

## Q3 2026: Scale & Intelligence

**Theme:** AI-driven automation, enterprise features, market expansion

### Goals
- Reach 400 paying customers
- Launch enterprise tier with SLA
- Achieve Net Revenue Retention > 120%

### Initiatives

#### 3.1 AI-Powered Automation
- Automatic hardware specification from LiDAR scan
- Photo-to-schedule: generate door schedule from site photos
- Predictive compliance: flag issues before field visit
- Smart quote generation from survey data

#### 3.2 Enterprise Features
- Single Sign-On (SSO) with SAML 2.0
- Custom role builder beyond preset RBAC roles
- Multi-organization hierarchy (parent/child accounts)
- Data residency options (US, EU, APAC)
- Custom SLA with dedicated support channel

#### 3.3 Field Technician App
- Dedicated mobile app for field survey capture
- Bluetooth hardware scanner integration
- Voice-to-text field notes
- GPS-tagged survey locations with map view

#### 3.4 Compliance Engine Expansion
- Canadian building code support (NBC/NBCC)
- UK Building Regulations Part B (fire safety)
- State-specific code overlays (California, New York, Florida)
- Automated compliance report PDF generation

---

## Q4 2026 - Q1 2027: Market Leadership

**Theme:** Platform ecosystem, industry standard, international expansion

### Goals
- Reach 800+ paying customers
- Launch API marketplace for third-party developers
- Begin international market entry

### Initiatives

#### 4.1 Platform API & Developer Ecosystem
- Public REST API with OAuth 2.0 and rate limiting
- Webhook subscriptions for real-time event streaming
- SDK for iOS/Android for LiDAR capture integration
- Developer documentation portal with sandbox environment

#### 4.2 Supply Chain Integration
- Direct ordering from manufacturer portals
- Real-time inventory availability checking
- Automated purchase order generation
- Delivery tracking and installation scheduling

#### 4.3 International Expansion
- Multi-currency support in estimation engine
- Localized compliance engines (Canada, UK, Australia)
- Regional hardware catalogs
- Multi-language expansion (Spanish, French, German)

#### 4.4 Industry Intelligence
- Anonymized benchmarking across customer base
- Market pricing trends from aggregated quote data
- Material lead time predictions
- Industry report publication (thought leadership)

---

## Success Metrics by Quarter

| Metric | Q1 2026 | Q2 2026 | Q3 2026 | Q4 2026 |
|---|---|---|---|---|
| Paying Customers | 50 | 150 | 400 | 800 |
| MRR | $7,500 | $25,000 | $75,000 | $175,000 |
| ARR Run Rate | $90K | $300K | $900K | $2.1M |
| Monthly Churn | <5% | <4% | <3% | <2.5% |
| NPS Score | 30+ | 40+ | 50+ | 55+ |
| Surveys/User/Month | 5 | 8 | 12 | 15 |
| Uptime | 99.5% | 99.9% | 99.9% | 99.95% |

---

## Technical Debt & Infrastructure

### Ongoing (Every Quarter)
- Continue extracting routes from server/routes.ts (10,600 lines) into individual route modules (73 already extracted)
- Resolve TypeScript strict mode errors incrementally
- Database migration tooling: move from db:push to versioned migrations
- Expand test coverage: unit tests for critical business logic
- API documentation: OpenAPI/Swagger spec generation
- Dependency updates and security patches

### Infrastructure Scaling Milestones
| Customers | Infrastructure Change |
|---|---|
| 100 | Dedicated Redis instance, CDN for static assets |
| 500 | Database read replicas, horizontal API scaling |
| 1,000 | Dedicated NATS cluster, database sharding evaluation |
| 5,000 | Multi-region deployment, edge caching |

---

## Decision Log

| Date | Decision | Rationale |
|---|---|---|
| Feb 2026 | Triple-scan LiDAR enforcement | Ensures complete hardware identification from all angles |
| Feb 2026 | Maintain backward compatibility with dual-scan | Existing survey data must remain valid |
| Feb 2026 | Codebase cleanup (65 files removed) | Reduce maintenance burden, improve developer velocity |
| Feb 2026 | Reinstated strategic documents | Assessment, deployment, marketing, and roadmap docs needed for stakeholder alignment |

---

## How to Use This Roadmap

1. **Quarterly reviews:** Reassess priorities based on customer feedback and market conditions
2. **Feature requests:** Evaluate against roadmap themes; fast-track if aligned
3. **Resource allocation:** Use quarterly goals to guide hiring and budget decisions
4. **Stakeholder communication:** Share condensed version with investors and partners
5. **Technical planning:** Use infrastructure milestones to plan capacity ahead of demand
