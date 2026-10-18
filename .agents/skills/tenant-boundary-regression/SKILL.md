---
name: tenant-boundary-regression
description: "Design adversarial regression checks for changes to tenant-owned records, exports, sharing or identity linking in a multi-tenant application. Use when a change can expose another organization's data or reassign legacy ownership."
---

# Tenant-boundary regression

Before changing an endpoint, trace three identifiers independently:
the authenticated provider subject, the local application user key, and the
organization owning the record. They can differ. A provider migration does not
justify rewriting ownership foreign keys.

1. Trace the route actually reached, including earlier overlapping legacy
   registrations. Sidebar visibility is not server authorization.
2. Identify where organization context comes from and where record ownership
   is checked. Client-supplied organization IDs must not override session scope.
3. Create two organizations with different users and at least one shared-looking
   record identifier. Preserve a fixture where local ID differs from provider ID.
4. Apply the matrix in `references/access-matrix.md` to the changed read/write,
   export, share or callback path. Use an isolated fixture store, never live data.
5. Assert denial also prevents writes, object access and notification/provider
   calls—not merely that the HTTP response says forbidden.

Use the existing auth/database/testing skills for environment operations.
This procedure is not a full security scan or permission to change identity
providers. Keep repository-specific account/schema facts in its documentation.
