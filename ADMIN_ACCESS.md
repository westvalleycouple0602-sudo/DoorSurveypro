# DoorSurvey Pro — Administrator Access Guide

## Application URL

| Environment | URL |
|---|---|
| Development | `http://localhost:5000` |
| Preview (Replit) | Your Replit project's webview URL (shown in the preview pane) |
| Production (deployed) | Your custom `.replit.app` domain or configured custom domain |

---

## How to Sign In

### Method 1 — Email & Password (Recommended for Admins)

**To sign in to an existing account:**
1. Navigate to **`/login`**
2. Click **Email / Create Account** to expand the section
3. Select the **Sign In** tab
4. Enter your email and password, then click **Sign In with Password**

**To create a new admin account:**
1. Navigate to **`/login`**
2. Click **Email / Create Account** to expand the section
3. Select the **Create Account** tab
4. Fill in your first name, email, a password (minimum 8 characters), and your organization name
5. Click **Create Account & Sign In**

> You will automatically become the **Owner** of the new organization — the highest privilege level in the system.

### Method 2 — Replit Authentication (Single Sign-On)

1. Navigate to **`/login`**
2. Click **Continue with Replit**
3. Authorize the application in the Replit OAuth popup

---

## Role Hierarchy

| Role | Description |
|---|---|
| **owner** | Full access — can manage all users, billing, settings, and system config. Only one per organization. |
| **admin** | Near-full access — can access the admin panel, manage users and teams, configure integrations |
| **manager / pm_manager** | Project management access — manage projects, teams, and scheduling |
| **project_manager** | Full project lifecycle management |
| **engineer** | Technical survey and compliance work |
| **sales_rep** | Quotes, customers, and client-facing features |
| **procurement_officer** | Purchase orders and hardware procurement |
| **technician** | Field survey and installation access |
| **viewer** | Read-only access to assigned projects |

---

## Admin Panel — `/system-admin`

Once signed in as **owner** or **admin**, navigate to **`/system-admin`** in the application sidebar.

### What You Can Do Here

#### User Management
- View all users across all organizations
- Update user roles (promote/demote within their organization)
- Delete user accounts
- Search and filter users by name, email, or organization

#### Organization Management
- View all registered organizations and their subscription status
- See project counts, user counts, and billing tier per organization
- Delete organizations (permanent — use with caution)

#### Audit Logs
- Browse a full audit trail of all administrative actions
- Filter by date range, user, or action type

#### System Health
- Check database connectivity and query latency
- Check Redis cache status
- Check background job queue status (pending, active, completed, failed)
- View server uptime, memory usage, and Node.js version

#### Cache Management
- Clear the distributed Redis cache when needed
- Monitor cache hit/miss rates

#### Job Queue Management
- Retry failed background jobs
- Clear completed job history

#### Feature Flags
- View and toggle feature flags for specific subscription tiers or organizations

#### Customer Management
- View and manage customer records across organizations
- Add or remove customers

---

## Backend-Only Admin Endpoints

Two raw JSON endpoints are protected by HTTP Basic Authentication using environment variables. These are intended for internal debugging and data inspection.

### Setup

Set these two environment variables in your Replit Secrets (or `.env` file):

```
ADMIN_USER=your_chosen_username
ADMIN_PASS=your_chosen_password
```

> If these variables are not set, the endpoints are disabled and return 503.

### Available Endpoints

| Endpoint | Description |
|---|---|
| `GET /admin-list` | Returns a raw JSON list of all users and organizations |
| `GET /admin-hubspot` | Returns HubSpot sync status for all organizations |

### How to Access

These endpoints use HTTP Basic Auth. You can access them with curl:

```bash
curl -u "your_username:your_password" https://yourapp.replit.app/admin-list
curl -u "your_username:your_password" https://yourapp.replit.app/admin-hubspot
```

Or in a browser — when prompted for credentials, enter `ADMIN_USER` as the username and `ADMIN_PASS` as the password.

---

## Granting Admin Access to Another User

1. Sign in as **owner**
2. Go to **Settings → Team** or navigate to **`/team`**
3. Find the user in the members list
4. Click the role dropdown next to their name
5. Select **admin**
6. The user now has access to the `/system-admin` panel

Alternatively, an **owner** can directly promote a user via the system admin panel at `/system-admin → Users → Edit Role`.

---

## Security Notes

- The `/system-admin` panel is protected by both session authentication and role enforcement — unauthenticated requests or users without `owner`/`admin` role receive a 401/403 response.
- The `ADMIN_USER`/`ADMIN_PASS` basic auth credentials should be strong, randomly generated strings — treat them like API keys.
- Password reset is available at **`/forgot-password`** for email/password accounts.
- Two-factor authentication (TOTP) can be enabled per-user from the account settings page.
- All admin actions are recorded in the audit log.

---

## Quick Reference — Important URLs

| Page | Path |
|---|---|
| Login | `/login` |
| Register (Create Account) | `/login` → Email / Create Account tab |
| Forgot Password | `/forgot-password` |
| Dashboard | `/` |
| Admin Panel | `/system-admin` |
| Team Management | `/team` |
| Projects | `/projects` |
| Settings / Branding | `/branding` |
| Scheduling | `/scheduling` |
| Wiring Diagrams | `/wiring-diagrams` |
| Compliance | `/projects/:id/compliance` |
| Floor Plans | `/projects/:id/floor-plans` |
| Hardware Catalog | `/catalog` |
| Reports | `/reports` |
