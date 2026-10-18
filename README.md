# DoorSurvey Pro

> **Commercial Door Surveying & Estimation SaaS Platform**  
> Production-ready multi-tenant platform for the commercial door industry with A+ security rating.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Deployed on Replit](https://img.shields.io/badge/Deployed%20on-Replit-667881?style=flat&logo=replit&logoColor=white)](https://replit.com)

---

## 🚀 Quick Start

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run start
```

### Database Migrations
```bash
npm run db:push
```

---

## 📋 Overview

DoorSurvey Pro is a comprehensive SaaS platform designed for commercial door distributors, general contractors, and surveying professionals. It streamlines the entire door surveying workflow from field data collection to procurement and installation.

### Key Capabilities

- 🏢 **Multi-Tenant Architecture** - Complete data isolation between organizations
- 🔐 **Enterprise Security** - A+ rating with Helmet, CSP, HSTS, CSRF protection
- 💳 **Subscription Billing** - Stripe-powered with 4 tiers and 3 add-on packages
- 📊 **54 Production Pages** - Comprehensive error handling across entire platform
- 🤖 **AI-Powered Features** - Photo analysis, compliance validation, hardware recommendations
- 📱 **Mobile-Optimized** - Responsive design for field technicians
- 🔄 **Real-Time Sync** - Live data updates across devices

---

## 💰 Pricing Tiers

| Tier | Monthly | Annual | Features |
|------|---------|--------|----------|
| **Free** | $0 | $0 | 3 Projects, 1 User, 5 Scans/day |
| **Starter** | $39 | $312/yr | 5 Projects, 1 User, 10 Scans/day |
| **Professional** | $129 | $1,032/yr | Unlimited Projects, 10 Users, Team Features ⭐ |
| **Enterprise** | $399 | $3,192/yr | Unlimited Everything, API Access, Dedicated Support |

**Save 33% with annual billing!** All paid plans include a 14-day free trial.

### Add-On Packages
- **Manufacturer Database Access**: $49/mo or $392/yr
- **Advanced Analytics / AI Diagnostics**: $79/mo or $632/yr
- **Offline Sync Expansion**: $20/mo or $160/yr

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 18 with TypeScript
- TanStack Query (data fetching)
- Wouter (routing)
- Shadcn UI + Radix UI (components)
- Tailwind CSS (styling)

**Backend:**
- Node.js + Express
- TypeScript
- Drizzle ORM
- PostgreSQL (Neon serverless)
- Redis (caching & job queues)
- BullMQ (background jobs)

**Authentication & Security:**
- Replit Auth (OpenID Connect)
- Session-based authentication
- TOTP 2FA support
- Multi-layer input sanitization
- Rate limiting (tiered by subscription)
- CSRF protection

**Integrations:**
- Stripe (payments & subscriptions)
- OpenAI (AI features)
- Resend (email)
- HubSpot CRM (optional)

### Project Structure

```
doorsurvey-pro/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components (54 total)
│   │   ├── lib/         # Utilities & helpers
│   │   └── hooks/       # Custom React hooks
├── server/              # Express backend
│   ├── routes/          # API route handlers
│   ├── utils/           # Server utilities
│   └── index.ts         # Server entry point
├── shared/              # Shared types & schemas
│   └── schema.ts        # Drizzle database schema
├── docs/                # Additional documentation
├── python-services/     # Python microservices (LiDAR, OCR)
└── tests/               # E2E tests (Playwright)
```

---

## 🔐 Security Features

DoorSurvey Pro maintains an **A+ security rating** with:

- ✅ **HTTP Security Headers** (Helmet.js)
- ✅ **Content Security Policy** (CSP)
- ✅ **HSTS** (HTTP Strict Transport Security)
- ✅ **Multi-Layer Input Sanitization** (XSS, NoSQL injection prevention)
- ✅ **Enhanced Rate Limiting** (tiered by subscription)
- ✅ **Multi-Tenant Data Isolation** (row-level security)
- ✅ **CSRF Protection** (token-based)
- ✅ **Webhook Security** (signature verification)
- ✅ **Session Security** (secure cookies, rotation)
- ✅ **Optimistic Concurrency Control**
- ✅ **Atomic Nonce Verification** (anti-bot/spam protection)

See [SECURITY.md](./SECURITY.md) for complete security documentation.

---

## 📚 Key Features

### Project Management
- Multi-project organization
- Team collaboration tools
- Role-based access control
- Project templates
- Custom workflows

### Door Surveying
- Field data collection
- Photo capture & annotation
- Barcode scanning (hardware labels)
- LiDAR measurements
- Opening specifications
- Hardware schedules

### Catalog & Procurement
- Custom product catalogs
- Manufacturer integration
- Automated literature retrieval
- Purchase order management
- Partner pricing comparison
- International trade calculator

### AI & Automation
- Photo analysis (door identification)
- Measurement validation
- Compliance checking
- Hardware recommendations
- Document intelligence (OCR + NLP)
- Predictive analytics

### Sales & Marketing
- Lead capture forms
- Quote generation
- Payment gateway
- Sales funnel tracking
- CRM integration
- Marketing landing pages

### Analytics & Reporting
- Project profitability
- Team productivity
- Usage metrics
- Custom reports
- Export capabilities (Excel, PDF, CSV)

---

## 🚀 Deployment

### Replit Autoscale Deployment

The application is configured for Replit's Autoscale deployment:

```toml
[deployment]
deploymentTarget = "autoscale"
build = ["npm", "run", "build"]
run = ["npm", "run", "start"]
```

**To Deploy:**
1. Click the "Deploy" button in Replit
2. Your app will be built and deployed automatically
3. Access at `https://[your-repl-name].replit.app`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Environment Variables

Required production secrets:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signature
- `OPENAI_API_KEY` - OpenAI API key (for AI features)
- `RESEND_API_KEY` - Email service key

Optional:
- `REDIS_HOST` - Redis hostname (default: 127.0.0.1)
- `REDIS_PORT` - Redis port (default: 6379)
- `REDIS_PASSWORD` - Redis authentication
- `HUBSPOT_API_KEY` - CRM integration

---

## 📖 Documentation

### User Guides
- [User Guide](./USER_GUIDE.md) - End-user documentation
- [Marketing Setup](./MARKETING_SETUP.md) - Landing page & lead generation
- [Manual QA Checklist](./MANUAL_QA_CHECKLIST.md) - Testing procedures

### Technical Documentation
- [Architecture](./ARCHITECTURE.md) - System design & patterns
- [API Documentation](./API_DOCUMENTATION.md) - REST API reference
- [API Versioning](./API_VERSIONING.md) - Versioning strategy
- [Security](./SECURITY.md) - Security implementation details
- [Migrations](./MIGRATIONS.md) - Database migration guide

### Operations
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production deployment
- [Operations Runbook](./OPERATIONS_RUNBOOK.md) - Day-to-day operations
- [Launch Readiness](./LAUNCH_READINESS.md) - Pre-launch checklist
- [Redis Setup](./REDIS_SETUP.md) - Redis configuration guide

### Development
- [Contributing](./CONTRIBUTING.md) - Contribution guidelines
- [Design Guidelines](./design_guidelines.md) - UI/UX standards
- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - Feature roadmap
- [Python Services](./PYTHON_SERVICES.md) - Microservices documentation

---

## 🧪 Testing

### E2E Tests (Playwright)
```bash
npx playwright test
```

### Unit Tests (Jest)
```bash
npm test
```

### Manual Testing
Follow the [Manual QA Checklist](./MANUAL_QA_CHECKLIST.md)

---

## 🔄 Recent Updates

### October 28, 2025
- ✅ **Subscription Pricing Overhaul** - Industry-aligned pricing tiers
- ✅ **Annual Billing Support** - 33% savings on annual subscriptions
- ✅ **Add-On Packages** - Revenue-generating add-ons for expanded features
- ✅ **Browser Compatibility Fix** - Resolved process.env issue in shared files
- ✅ **Redis Installation** - Distributed caching infrastructure prepared
- ✅ **Production Ready** - A+ security rating with comprehensive error handling

See [replit.md](./replit.md) for complete change history.

---

## 📊 System Status

- **Total Pages**: 54 (all with production error handling)
- **Security Rating**: A+
- **Database**: PostgreSQL (Neon serverless)
- **Caching**: Redis with in-memory fallback
- **Job Queue**: BullMQ with in-memory fallback
- **Deployment**: Autoscale (Replit)
- **Build Time**: ~26 seconds
- **Bundle Size**: 2.26 MB (optimizable)

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

Proprietary - All rights reserved.

---

## 🆘 Support

- **Documentation**: See `/docs` directory
- **Issues**: Contact support@doorsurvey.pro
- **Enterprise Support**: Included with Enterprise tier

---

## 🙏 Acknowledgments

Built with modern web technologies and best practices:
- Replit (deployment platform)
- Stripe (payment processing)
- Neon (serverless PostgreSQL)
- OpenAI (AI capabilities)
- Shadcn (UI components)

---

**Made with ❤️ for the commercial door industry**
