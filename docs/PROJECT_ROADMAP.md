# Existing-app workstreams

This is a source-controlled work plan, not a claim that a remote GitHub Projects
board or new repository has been created.

| Workstream | Outcome | Acceptance evidence |
| --- | --- | --- |
| 1. Engineering foundation | Repeatable startup, dependency restore, tests, type check and production build | Named commands run; CI reports real failures |
| 2. Core commercial workflow | Customer → project → opening/survey → hardware → estimate → quote | Representative saved project can complete the workflow with expected totals and exports |
| 3. Accounts and tenancy | Reliable sign-in, legacy links, operator access and team permissions | Two-organization access tests; no reassigned ownership or duplicated identities |
| 4. Capture reliability | Existing scan protocols resume safely without losing files | Restart, host replacement, retries and concurrent updates tested separately |
| 5. Integrations and operations | AI/email/CRM/accounting/signature functions fail clearly or work with valid setup | Provider-specific sandbox evidence; no placeholder output presented as final |
| 6. Collaboration and handoff | Private source repository, reviewed changes and recoverable backups | Remote branch/content verified; separate data/media/configuration preservation |

## Board structure

For the existing private repository, use Backlog → Ready → In progress → Review
→ Verified. Each issue should identify its workstream, user outcome, acceptance
checks, organization/role implications, and any data/service dependency.

Do not create parallel app repositories merely to represent these workstreams.
Use issues/branches in the existing repository unless a truly independent
product or deployment boundary is explicitly approved.

## Release sequence

Fix foundation failures first. Validate one complete survey-to-quote path next,
then extend coverage by role and integration. Track blocked service setup
separately from implemented code. A build, a screenshot or installed SDK alone
does not establish that every function is operational.
