---
name: Auth migration compatibility
description: Why identity-provider replacement must preserve flexible account linkage and separate operator access
---

Preserve the original account linkage when changing authentication providers, including cases where the application's primary key differs from the provider's subject.

**Why:** The pre-migration app deliberately supported accounts matched through email or username as well as subject ID. Assuming every stored ID is a provider subject would disconnect those accounts from their existing memberships and projects.

**How to apply:** Resolve verified identity claims against the existing bridge before provisioning a new account. Keep the resolved application key for ownership comparisons and data access; reserve native identity-provider IDs for that provider's own API.

Use a verified primary email for initial email-based linking and preserve a durable provider-to-local binding afterward.

**Why:** Re-evaluating a mutable email on every request can transfer membership access if that address is changed or reassigned. Managed Clerk provisioning supplies custom identity claims; missing configuration must fail explicitly instead of creating a parallel account.

**How to apply:** Establish the bridge once, validate the provider subject, and prevent conflicting bindings across concurrent servers. Keep basic identity display in session claims rather than synchronizing identity columns.

The operator console is a separate credential-based access path, not a normal end-user sign-in.

**Why:** Replacing end-user authentication must not remove access to the independent operator console.

**How to apply:** Keep that access isolated from end-user sessions when making future authentication changes.

Do not add global credentialed CORS when integrating an identity provider's same-origin proxy. Keep operator mutations protected by both origin checks and CSRF tokens.

**Why:** SameSite cookies can still accompany requests from an untrusted sibling origin; reflecting arbitrary origins would expose normal and operator APIs. The authentication proxy does not require global CORS.

**How to apply:** Preserve the application's cross-origin boundary independently of provider setup examples, and keep canonical browser mutations on the shared CSRF-aware request path.
